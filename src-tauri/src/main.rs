#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use reqwest::header;

#[derive(Serialize, Deserialize)]
struct ApiResponse {
    success: bool,
    message: Option<String>,
    data: Option<serde_json::Value>,
}

#[tauri::command]
async fn make_request(url: String, data: serde_json::Value) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();

    let response = client.post(&url)
        .header(header::CONTENT_TYPE, "application/json")
        .json(&data)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    let response_data = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        success: status.is_success(),
        message: response_data.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()),
        data: Some(response_data),
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![make_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
