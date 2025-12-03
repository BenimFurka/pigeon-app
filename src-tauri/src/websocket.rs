use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use url::Url;
use tauri::{AppHandle, Emitter};
use log::{info, warn, error, debug};

type WsStream = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;

#[derive(Error, Debug)]
pub enum WsError {
    #[error("WebSocket error: {0}")]
    Tungstenite(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("URL error: {0}")]
    Url(#[from] url::ParseError),
    #[error("Connection error: {0}")]
    Connection(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub struct WebSocketClient {
    sink: Arc<Mutex<Option<futures_util::stream::SplitSink<WsStream, Message>>>>,
    is_connected: Arc<Mutex<bool>>,
}

impl WebSocketClient {
    pub async fn new(url: &str, token: &str, app: AppHandle) -> Result<Self, WsError> {
        info!("Creating new WebSocket connection to: {}", url);
        
        let url = Url::parse(url)?;
        
        let (ws_stream, _) = connect_async(&url).await.map_err(|e| {
            error!("WebSocket connection failed: {}", e);
            WsError::Connection(format!("Connection failed: {}", e))
        })?;
        
        info!("WebSocket connection established successfully");
        
        let (write, read) = ws_stream.split();
        let sink = Arc::new(Mutex::new(Some(write)));
        let is_connected = Arc::new(Mutex::new(true));
        
        let client = Self {
            sink: Arc::clone(&sink),
            is_connected: Arc::clone(&is_connected),
        };
        
        Self::start_message_handler(read, Arc::clone(&sink), Arc::clone(&is_connected), app);
        client.authenticate(token).await?;
        
        Ok(client)
    }
    
    async fn authenticate(&self, token: &str) -> Result<(), WsError> {
        let auth_message = serde_json::to_string(&serde_json::json!({
            "type": "authenticate",
            "data": { 
                "token": token,
            }
        }))?;
        
        info!("Sending authentication...");
        self.send_message(&auth_message).await?;
        info!("Authentication sent successfully");
        
        Ok(())
    }
    
    pub async fn send_message(&self, message: &str) -> Result<(), WsError> {
        debug!("Sending WebSocket message: {}", message);
        
        let connected = *self.is_connected.lock().await;
        if !connected {
            return Err(WsError::Connection("WebSocket is not connected".to_string()));
        }
        
        let mut sink_lock = self.sink.lock().await;
        match sink_lock.as_mut() {
            Some(write) => {
                let send_result = write.send(Message::Text(message.to_string())).await;
                match send_result {
                    Ok(_) => {
                        debug!("Message sent successfully");
                        Ok(())
                    }
                    Err(e) => {
                        error!("Failed to send message: {}", e);
                        *self.is_connected.lock().await = false;
                        Err(WsError::Tungstenite(e))
                    }
                }
            }
            None => {
                warn!("Attempted to send message but WebSocket is not connected");
                *self.is_connected.lock().await = false;
                Err(WsError::Connection("WebSocket sink is not available".to_string()))
            }
        }
    }
    
    fn start_message_handler(
        mut read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin + Send + 'static,
        sink: Arc<Mutex<Option<futures_util::stream::SplitSink<WsStream, Message>>>>,
        is_connected: Arc<Mutex<bool>>,
        app: AppHandle,
    ) {
        info!("Starting WebSocket message handler");
        
        tokio::spawn(async move {
            info!("WebSocket message handler started");
            
            while let Some(message) = read.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        debug!("Received text message: {}", text);
                        
                        match serde_json::from_str::<serde_json::Value>(&text) {
                            Ok(json) => {
                                match app.emit("websocket-message", json) {
                                    Ok(_) => debug!("Message emitted to frontend"),
                                    Err(e) => error!("Failed to emit message to frontend: {}", e),
                                }
                            }
                            Err(e) => {
                                warn!("Failed to parse message as JSON: {}", e);
                                match app.emit("websocket-raw-message", text) {
                                    Ok(_) => debug!("Raw message emitted"),
                                    Err(e) => error!("Failed to emit raw message: {}", e),
                                }
                            }
                        }
                    }
                    Ok(Message::Close(frame)) => {
                        info!("WebSocket connection closed by server: {:?}", frame);
                        *is_connected.lock().await = false;
   
                        let event_data = serde_json::json!({
                            "code": frame.as_ref().map(|f| u16::from(f.code)),
                            "reason": frame.as_ref().map(|f| f.reason.as_ref().to_string())
                        });
                        
                        match app.emit("websocket-close", event_data) {
                            Ok(_) => debug!("Close event emitted to frontend"),
                            Err(e) => error!("Failed to emit close event: {}", e),
                        }
                        break;
                    }
                    Ok(Message::Ping(data)) => {
                        debug!("Received ping ({} bytes)", data.len());
                        if let Some(write) = sink.lock().await.as_mut() {
                            if let Err(e) = write.send(Message::Pong(data)).await {
                                error!("Failed to send pong: {}", e);
                            }
                        }
                    }
                    Ok(Message::Pong(_)) => {
                        debug!("Received pong");
                    }
                    Ok(Message::Binary(data)) => {
                        debug!("Received binary message ({} bytes)", data.len());
                        match app.emit("websocket-binary", data) {
                            Ok(_) => debug!("Binary message emitted"),
                            Err(e) => error!("Failed to emit binary message: {}", e),
                        }
                    }
                    Err(e) => {
                        error!("WebSocket error: {}", e);
                        *is_connected.lock().await = false;
                        
                        match app.emit("websocket-error", e.to_string()) {
                            Ok(_) => debug!("Error event emitted to frontend"),
                            Err(emit_err) => error!("Failed to emit error event: {}", emit_err),
                        }
                        break;
                    }
                    _ => {
                        debug!("Received other message type");   
                    }
                }
            }
            
            let _ = sink.lock().await.take();
            info!("WebSocket message handler stopped");
        });
    }
    
    pub async fn disconnect(&self) {
        info!("Disconnecting WebSocket...");
        
        *self.is_connected.lock().await = false;
        
        if let Some(mut sink) = self.sink.lock().await.take() {
            match sink.close().await {
                Ok(_) => info!("WebSocket disconnected gracefully"),
                Err(e) => warn!("Error during WebSocket disconnection: {}", e),
            }
        }
    }
}