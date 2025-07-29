#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use reqwest::header::{self, HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;

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
    data: Option<serde_json::Value>,
    headers: Option<serde_json::Value>,
}

#[tauri::command]
async fn make_request(options: RequestOptions) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("application/json"));
    
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
        Some("PUT") => Method::PUT,
        Some("DELETE") => Method::DELETE,
        Some("PATCH") => Method::PATCH,
        Some("POST") | _ => Method::POST,
    };

    let mut request_builder = client.request(method.clone(), &options.url)
        .headers(headers);

    if method != Method::GET && options.data.is_some() {
        request_builder = request_builder.json(&options.data);
    }

    let response = request_builder
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response_data: serde_json::Value = response.json()
        .await
        .map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        success: response_data.get("success").and_then(|s| s.as_bool()).unwrap_or(false),
        message: response_data.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()),
        data: response_data.get("data").cloned(),
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![make_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}