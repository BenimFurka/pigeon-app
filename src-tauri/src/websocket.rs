use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use url::Url;
use tauri::{AppHandle, Manager};

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
        let mut url = Url::parse(url)?;
        
        if url.query_pairs().find(|(k, _)| k == "token").is_none() {
            let mut pairs = url.query_pairs_mut();
            pairs.append_pair("token", &format!("Bearer {}", token));
        }

        let (ws_stream, _) = connect_async(url).await?;
        let (write, read) = ws_stream.split();

        let sink = Arc::new(Mutex::new(Some(write)));
        let sink_clone = Arc::clone(&sink);

        let token = token.to_string();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            let auth_message = serde_json::json!({
                "type": "auth",
                "data": { "token": format!("Bearer {}", token) }
            });
            
            if let Some(mut write) = sink_clone.lock().await.as_mut() {
                let _ = write.send(Message::Text(auth_message.to_string())).await;
            }
        });

        Self::start_message_handler(read, Arc::clone(&sink), app);

        Ok(WebSocketClient { sink })
    }

    pub async fn send_message(&self, message: &str) -> Result<(), WsError> {
        let mut lock = self.sink.lock().await;
        if let Some(write) = lock.as_mut() {
            write.send(Message::Text(message.to_string())).await?;
            Ok(())
        } else {
            Err(WsError::Connection("WebSocket is not connected".to_string()))
        }
    }

    pub async fn disconnect(&self) {
        if let Some(mut sink) = self.sink.lock().await.take() {
            let _ = sink.close().await;
        }
    }

    fn start_message_handler(
        mut read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin + Send + 'static,
        sink: Arc<Mutex<Option<futures_util::stream::SplitSink<WsStream, Message>>>>,
        app: AppHandle,
    ) {
        tokio::spawn(async move {
            while let Some(message) = read.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        let _ = app.emit_all("websocket-message", text);
                    }
                    Ok(Message::Close(_)) => {
                        let _ = app.emit_all("websocket-close", "");
                        break;
                    }
                    Err(e) => {
                        let _ = app.emit_all("websocket-error", e.to_string());
                        break;
                    }
                    _ => {
                        if let Ok(Message::Binary(data)) = message {
                            if let Ok(text) = String::from_utf8(data) {
                                let _ = app.emit_all("websocket-message", text);
                            }
                        }
                    }
                }
            }
            
            let _ = sink.lock().await.take();
        });
    }
}