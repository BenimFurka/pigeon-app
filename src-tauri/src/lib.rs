use std::sync::Arc;
use tokio::sync::Mutex;
use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue}};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use log::{info, warn, error, debug};
use env_logger;
use lazy_static::lazy_static;

mod websocket;
use websocket::WebSocketClient;

lazy_static! {
  static ref WS_CLIENT: Arc<Mutex<Option<WebSocketClient>>> = Arc::new(Mutex::new(None));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      app.handle().plugin(tauri_plugin_fs::init())?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let _ = env_logger::builder().is_test(true).try_init();
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      make_request,
      upload_attachment,
      init_websocket,
      send_websocket_message,
      disconnect_websocket
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse {
  success: bool,
  message: Option<String>,
  data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct RequestOptions {
  url: String,
  method: Option<String>,
  body: Option<serde_json::Value>,
  headers: Option<serde_json::Value>,
}

#[tauri::command]
async fn make_request(options: RequestOptions) -> Result<ApiResponse, String> {
  info!("Making request to: {}", options.url);
  debug!("Request options: {:?}", options);

  let client = Client::new();
  let mut headers = HeaderMap::new();
  headers.insert("Content-Type", HeaderValue::from_static("application/json"));

  if let Some(custom_headers) = options.headers {
    if let serde_json::Value::Object(headers_map) = custom_headers {
      for (key, value) in headers_map {
        if let serde_json::Value::String(value_str) = value {
          if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_str(&value_str) {
              headers.insert(header_name, header_value);
            }
          }
        }
      }
    }
  }

  let method = match options.method.as_deref() {
    Some("GET") => Method::GET,
    Some("POST") => Method::POST,
    Some("PUT") => Method::PUT,
    Some("DELETE") => Method::DELETE,
    Some("PATCH") => Method::PATCH,
    _ => {
      warn!("Unknown method specified, defaulting to GET");
      Method::GET
    }
  };

  debug!("Using method: {:?}", method);

  let mut request_builder = client.request(method.clone(), &options.url).headers(headers.clone());

  if method != Method::GET {
    if let Some(body) = &options.body {
      if let serde_json::Value::String(body_str) = body {
        match serde_json::from_str::<serde_json::Value>(body_str) {
          Ok(parsed_body) => { request_builder = request_builder.json(&parsed_body); }
          Err(_) => { request_builder = request_builder.body(body_str.clone()); }
        }
      } else {
        request_builder = request_builder.json(body);
      }
    }
  }

  let response = match request_builder.send().await {
    Ok(resp) => { info!("Request successful, status: {}", resp.status()); resp },
    Err(e) => { error!("Request failed: {}", e); return Err(e.to_string()); }
  };

  let status = response.status();
  let response_text = match response.text().await {
    Ok(text) => { debug!("Response text: {}", text); text },
    Err(e) => { error!("Failed to read response text: {}", e); return Err(e.to_string()); }
  };

  let response_data = if !response_text.is_empty() {
    match serde_json::from_str(&response_text) { Ok(data) => data, Err(_) => { warn!("Failed to parse response as JSON, using null"); serde_json::Value::Null } }
  } else { debug!("Empty response received"); serde_json::Value::Null };

  let success = status.is_success();
  let message = response_data.get("message").and_then(|m| m.as_str()).map(|s| s.to_string());
  let data = response_data.get("data").cloned();

  info!("Request completed with success: {}", success);
  Ok(ApiResponse { success, message, data })
}

#[tauri::command]
async fn init_websocket(app: AppHandle, url: String, token: String) -> Result<(), String> {
  info!("Initializing WebSocket connection to: {}", url);
  let mut client = WS_CLIENT.lock().await;
  if let Some(ws_client) = client.as_ref() {
    info!("Disconnecting existing WebSocket client");
    ws_client.disconnect().await;
  }
  let ws_client = WebSocketClient::new(&url, &token, app)
    .await
    .map_err(|e| { error!("Failed to create WebSocket client: {}", e); e.to_string() })?;
  *client = Some(ws_client);
  info!("WebSocket client initialized successfully");
  Ok(())
}

#[tauri::command]
async fn send_websocket_message(message: String) -> Result<(), String> {
  debug!("Sending WebSocket message: {}", message);
  let client = WS_CLIENT.lock().await;
  if let Some(ws_client) = client.as_ref() {
    ws_client.send_message(&message).await.map_err(|e| { error!("Failed to send WebSocket message: {}", e); e.to_string() })?;
    info!("WebSocket message sent successfully");
    Ok(())
  } else {
    warn!("WebSocket client is not initialized when trying to send message");
    Err("WebSocket client is not initialized".to_string())
  }
}

#[derive(Debug, Deserialize)]
struct UploadOptions {
  url: String,
  file_path: String,
  headers: Option<serde_json::Value>,
}

#[tauri::command]
async fn upload_attachment(options: UploadOptions) -> Result<ApiResponse, String> {
  info!("Uploading attachment to: {}", options.url);
  debug!("Upload options: {:?}", options);

  let client = Client::new();
  let mut headers = HeaderMap::new();

  if let Some(custom_headers) = options.headers {
    if let serde_json::Value::Object(headers_map) = custom_headers {
      for (key, value) in headers_map {
        if let serde_json::Value::String(value_str) = value {
          if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_str(&value_str) {
              headers.insert(header_name, header_value);
            }
          }
        }
      }
    }
  }

  let file_content = std::fs::read(&options.file_path)
    .map_err(|e| format!("Failed to read file: {}", e))?;

  let file_name = std::path::Path::new(&options.file_path)
    .file_name()
    .and_then(|n| n.to_str())
    .unwrap_or("file");

  let mime_type = mime_guess::from_path(&options.file_path)
    .first_or_octet_stream()
    .to_string();

  let part = reqwest::multipart::Part::bytes(file_content)
    .file_name(file_name.to_string())
    .mime_str(&mime_type)
    .map_err(|e| format!("Failed to set MIME type: {}", e))?;

  let form = reqwest::multipart::Form::new()
    .part("file", part);

  let response = match client.post(&options.url)
    .headers(headers)
    .multipart(form)
    .send()
    .await {
      Ok(resp) => { info!("Upload successful, status: {}", resp.status()); resp },
      Err(e) => { error!("Upload failed: {}", e); return Err(e.to_string()); }
    };

  let status = response.status();
  let response_text = match response.text().await {
    Ok(text) => { debug!("Response text: {}", text); text },
    Err(e) => { error!("Failed to read response text: {}", e); return Err(e.to_string()); }
  };

  let response_data = if !response_text.is_empty() {
    match serde_json::from_str(&response_text) { 
      Ok(data) => data, 
      Err(_) => { 
        warn!("Failed to parse response as JSON, using null"); 
        serde_json::Value::Null 
      } 
    }
  } else { 
    debug!("Empty response received"); 
    serde_json::Value::Null 
  };

  let success = status.is_success();
  let message = response_data.get("message").and_then(|m| m.as_str()).map(|s| s.to_string());
  let data = response_data.get("data").cloned();

  info!("Upload completed with success: {}", success);
  Ok(ApiResponse { success, message, data })
}

#[tauri::command]
async fn disconnect_websocket() {
  info!("Disconnecting WebSocket");
  let client = WS_CLIENT.lock().await;
  if let Some(ws_client) = client.as_ref() { ws_client.disconnect().await; info!("WebSocket disconnected successfully"); }
  else { warn!("No WebSocket client to disconnect"); }
}
