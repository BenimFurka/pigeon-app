use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use url::Url;
use tauri::{AppHandle, Manager};
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
}

pub struct WebSocketClient {
    sink: Arc<Mutex<Option<futures_util::stream::SplitSink<WsStream, Message>>>>,
}

impl WebSocketClient {
    pub async fn new(url: &str, token: &str, app: AppHandle) -> Result<Self, WsError> {
        info!("Creating new WebSocket connection to: {}", url);
        debug!("Token: {}", token);
        
        let mut url = Url::parse(url)?;
        
        if url.query_pairs().find(|(k, _)| k == "token").is_none() {
            let mut pairs = url.query_pairs_mut();
            pairs.append_pair("token", &format!("Bearer {}", token));
            debug!("Added token to URL query parameters");
        }

        info!("Connecting to WebSocket...");
        let (ws_stream, _) = connect_async(url).await.map_err(|e| {
            error!("WebSocket connection failed: {}", e);
            e
        })?;
        info!("WebSocket connection established successfully");

        let (write, read) = ws_stream.split();

        let sink = Arc::new(Mutex::new(Some(write)));
        let sink_clone = Arc::clone(&sink);

        let token = token.to_string();
        tokio::spawn(async move {
            info!("Scheduling authentication message...");
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            
            let auth_message = serde_json::json!({
                "type": "auth",
                "data": { "token": format!("Bearer {}", token) }
            });
            
            debug!("Sending authentication message: {}", auth_message);
            
            if let Some(mut write) = sink_clone.lock().await.as_mut() {
                match write.send(Message::Text(auth_message.to_string())).await {
                    Ok(_) => info!("Authentication message sent successfully"),
                    Err(e) => error!("Failed to send authentication message: {}", e),
                }
            } else {
                warn!("Cannot send authentication message - sink is not available");
            }
        });

        Self::start_message_handler(read, Arc::clone(&sink), app);

        Ok(WebSocketClient { sink })
    }

    pub async fn send_message(&self, message: &str) -> Result<(), WsError> {
        debug!("Sending WebSocket message: {}", message);
        
        let mut lock = self.sink.lock().await;
        if let Some(write) = lock.as_mut() {
            write.send(Message::Text(message.to_string())).await.map_err(|e| {
                error!("Failed to send message: {}", e);
                e
            })?;
            debug!("Message sent successfully");
            Ok(())
        } else {
            warn!("Attempted to send message but WebSocket is not connected");
            Err(WsError::Connection("WebSocket is not connected".to_string()))
        }
    }

    pub async fn disconnect(&self) {
        info!("Disconnecting WebSocket...");
        if let Some(mut sink) = self.sink.lock().await.take() {
            match sink.close().await {
                Ok(_) => info!("WebSocket disconnected gracefully"),
                Err(e) => warn!("Error during WebSocket disconnection: {}", e),
            }
        } else {
            debug!("WebSocket already disconnected");
        }
    }

    fn start_message_handler(
        mut read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin + Send + 'static,
        sink: Arc<Mutex<Option<futures_util::stream::SplitSink<WsStream, Message>>>>,
        app: AppHandle,
    ) {
        info!("Starting WebSocket message handler");
        
        tokio::spawn(async move {
            debug!("WebSocket message handler started");
            
            while let Some(message) = read.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        debug!("Received text message: {}", text);
                        match app.emit_all("websocket-message", text) {
                            Ok(_) => debug!("Message emitted to frontend"),
                            Err(e) => error!("Failed to emit message to frontend: {}", e),
                        }
                    }
                    Ok(Message::Close(_)) => {
                        info!("WebSocket connection closed by server");
                        match app.emit_all("websocket-close", "") {
                            Ok(_) => debug!("Close event emitted to frontend"),
                            Err(e) => error!("Failed to emit close event: {}", e),
                        }
                        break;
                    }
                    Err(e) => {
                        error!("WebSocket error: {}", e);
                        match app.emit_all("websocket-error", e.to_string()) {
                            Ok(_) => debug!("Error event emitted to frontend"),
                            Err(emit_err) => error!("Failed to emit error event: {}", emit_err),
                        }
                        break;
                    }
                    Ok(Message::Binary(data)) => {
                        debug!("Received binary message ({} bytes)", data.len());
                        match String::from_utf8(data) {
                            Ok(text) => {
                                debug!("Converted binary to text: {}", text);
                                match app.emit_all("websocket-message", text) {
                                    Ok(_) => debug!("Binary message emitted to frontend"),
                                    Err(e) => error!("Failed to emit binary message: {}", e),
                                }
                            }
                            Err(e) => {
                                warn!("Failed to convert binary message to UTF-8: {}", e);
                            }
                        }
                    }
                    Ok(Message::Ping(data)) => {
                        debug!("Received ping ({} bytes)", data.len());
                    }
                    Ok(Message::Pong(data)) => {
                        debug!("Received pong ({} bytes)", data.len());
                    }
                    _ => {
                        debug!("Received other message type");
                    }
                }
            }
            
            info!("WebSocket message handler stopped");
            let _ = sink.lock().await.take();
        });
    }
}