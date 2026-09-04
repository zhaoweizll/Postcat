use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::command;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RequestConfig {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    query_params: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ResponseData {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    content_type: String,
    response_time: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Environment {
    id: String,
    name: String,
    variables: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RequestItem {
    id: String,
    name: String,
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    query_params: HashMap<String, String>,
    body_type: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Collection {
    id: String,
    name: String,
    requests: Vec<RequestItem>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct HistoryItem {
    id: String,
    timestamp: i64,
    method: String,
    url: String,
    status: u16,
    response_time: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanCollection {
    info: PostmanInfo,
    item: Vec<PostmanItem>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanInfo {
    name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanItem {
    name: String,
    request: Option<PostmanRequest>,
    item: Option<Vec<PostmanItem>>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanRequest {
    method: String,
    header: Option<Vec<PostmanHeader>>,
    url: Option<PostmanUrl>,
    body: Option<PostmanBody>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanHeader {
    key: String,
    value: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(untagged)]
enum PostmanUrl {
    String(String),
    Object(PostmanUrlObject),
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanUrlObject {
    raw: Option<String>,
    host: Option<Vec<String>>,
    path: Option<Vec<String>>,
    query: Option<Vec<PostmanQueryParam>>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanQueryParam {
    key: String,
    value: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostmanBody {
    mode: Option<String>,
    raw: Option<String>,
}

fn get_data_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".postcat")
}

fn read_json_file<T>(filename: &str) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    let data_dir = get_data_dir();
    let file_path = data_dir.join(filename);

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let mut file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| e.to_string())?;

    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_json_file<T>(filename: &str, data: &Vec<T>) -> Result<(), String>
where
    T: Serialize,
{
    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let file_path = data_dir.join(filename);
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;

    let mut file = File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())
}

#[command]
async fn send_request(config: RequestConfig) -> Result<ResponseData, String> {
    let start_time = std::time::Instant::now();

    let mut url = reqwest::Url::parse(&config.url).map_err(|e| e.to_string())?;

    for (key, value) in config.query_params {
        url.query_pairs_mut().append_pair(&key, &value);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let mut request_builder = client.request(
        reqwest::Method::from_bytes(config.method.as_bytes()).map_err(|e| e.to_string())?,
        url,
    );

    for (key, value) in config.headers {
        request_builder = request_builder.header(key, value);
    }

    if let Some(body) = config.body {
        if !body.is_empty() {
            request_builder = request_builder.body(body);
        }
    }

    let response = request_builder.send().await.map_err(|e| e.to_string())?;
    let response_time = start_time.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();

    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        headers.insert(key.as_str().to_string(), value.to_str().unwrap_or("").to_string());
    }

    let content_type = headers.get("content-type").cloned().unwrap_or_default();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ResponseData {
        status,
        status_text,
        headers,
        body,
        content_type,
        response_time,
    })
}

#[command]
fn get_environments() -> Result<Vec<Environment>, String> {
    read_json_file("environments.json")
}

#[command]
fn save_environment(env: Environment) -> Result<(), String> {
    let mut envs: Vec<Environment> = read_json_file("environments.json")?;
    if let Some(index) = envs.iter().position(|e| e.id == env.id) {
        envs[index] = env;
    } else {
        envs.push(env);
    }
    write_json_file("environments.json", &envs)
}

#[command]
fn delete_environment(id: String) -> Result<(), String> {
    let mut envs: Vec<Environment> = read_json_file("environments.json")?;
    envs.retain(|e| e.id != id);
    write_json_file("environments.json", &envs)
}

#[command]
fn get_collections() -> Result<Vec<Collection>, String> {
    read_json_file("collections.json")
}

#[command]
fn save_collection(col: Collection) -> Result<(), String> {
    let mut cols: Vec<Collection> = read_json_file("collections.json")?;
    if let Some(index) = cols.iter().position(|c| c.id == col.id) {
        cols[index] = col;
    } else {
        cols.push(col);
    }
    write_json_file("collections.json", &cols)
}

#[command]
fn delete_collection(id: String) -> Result<(), String> {
    let mut cols: Vec<Collection> = read_json_file("collections.json")?;
    cols.retain(|c| c.id != id);
    write_json_file("collections.json", &cols)
}

#[command]
fn get_history() -> Result<Vec<HistoryItem>, String> {
    read_json_file("history.json")
}

#[command]
fn save_history(item: HistoryItem) -> Result<(), String> {
    let mut history = read_json_file("history.json")?;
    history.insert(0, item);
    if history.len() > 100 {
        history.truncate(100);
    }
    write_json_file("history.json", &history)
}

#[command]
fn clear_history() -> Result<(), String> {
    write_json_file("history.json", &Vec::<HistoryItem>::new())
}

#[command]
fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

fn postman_items_to_requests(items: &[PostmanItem]) -> Vec<RequestItem> {
    let mut requests = Vec::new();
    for item in items {
        if let Some(request) = &item.request {
            let mut url = String::new();
            let mut query_params: HashMap<String, String> = HashMap::new();

            if let Some(postman_url) = &request.url {
                match postman_url {
                    PostmanUrl::String(s) => {
                        url = s.clone();
                    }
                    PostmanUrl::Object(obj) => {
                        if let Some(raw) = &obj.raw {
                            url = raw.clone();
                        } else {
                            let mut parts = Vec::new();
                            if let Some(host) = &obj.host {
                                parts.push(host.join("."));
                            }
                            if let Some(path) = &obj.path {
                                parts.push(path.join("/"));
                            }
                            url = parts.join("/");
                        }
                        if let Some(query) = &obj.query {
                            for q in query {
                                query_params.insert(
                                    q.key.clone(),
                                    q.value.clone().unwrap_or_default(),
                                );
                            }
                        }
                    }
                }
            }

            let mut headers: HashMap<String, String> = HashMap::new();
            if let Some(header_list) = &request.header {
                for h in header_list {
                    headers.insert(h.key.clone(), h.value.clone());
                }
            }

            let body = request.body.as_ref().and_then(|b| b.raw.clone());
            let body_type = request.body.as_ref().and_then(|b| {
                let mode = b.mode.as_deref()?;
                match mode {
                    "raw" => Some("raw".to_string()),
                    "urlencoded" => Some("x-www-form-urlencoded".to_string()),
                    "formdata" => Some("form-data".to_string()),
                    _ => None,
                }
            });

            requests.push(RequestItem {
                id: Uuid::new_v4().to_string(),
                name: item.name.clone(),
                method: request.method.clone(),
                url,
                headers,
                body,
                query_params,
                body_type,
            });
        }
        if let Some(sub_items) = &item.item {
            requests.extend(postman_items_to_requests(sub_items));
        }
    }
    requests
}

#[command]
fn import_postman_collection(json_str: String) -> Result<Collection, String> {
    let postman_col: PostmanCollection =
        serde_json::from_str(&json_str).map_err(|e| format!("解析失败: {}", e))?;

    let requests = postman_items_to_requests(&postman_col.item);

    Ok(Collection {
        id: Uuid::new_v4().to_string(),
        name: postman_col.info.name,
        requests,
    })
}

#[command]
fn export_collection_to_json(collection: Collection) -> Result<String, String> {
    serde_json::to_string_pretty(&collection).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_request,
            get_environments,
            save_environment,
            delete_environment,
            get_collections,
            save_collection,
            delete_collection,
            get_history,
            save_history,
            clear_history,
            generate_id,
            import_postman_collection,
            export_collection_to_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
