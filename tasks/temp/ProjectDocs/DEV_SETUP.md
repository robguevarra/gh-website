# Developer Setup Guide

## Prerequisites
*   **Python 3.10+**
*   **Google Cloud Credentials**: JSON key file (e.g., `manychat-openai-integration-xxxx.json`) placed in the project root.
*   **OpenAI API Key**: In `.env` file as `OPENAI_API_KEY=sk-...`

## Installation
1.  **Virtual Environment**:
    ```powershell
    python -m venv venv
    .\venv\Scripts\activate
    ```
2.  **Dependencies**:
    ```powershell
    pip install -r requirements.txt
    ```
    *(Ensure `flask`, `google-cloud-firestore`, `openai`, `requests`, `python-dotenv` are installed)*

## Running the System

You typically run two servers in separate terminals:

### 1. The Chatbot (V2)
This runs the improved bot logic locally.
```powershell
python app_v2.py
```
*   Running on: `http://localhost:8081`

### 2. The Admin & Comparison UI
This runs the dashboard.
```powershell
python comparison_app.py
```
*   Running on: `http://localhost:5000`

## File Structure
*   `app_v2.py`: **Core Logic**. Handles OpenAI calls, Firestore fetching, and "Fast Brain" routing.
*   `comparison_app.py`: **UI Server**. Hosts the `/admin` page and the comparison tool.
*   `upload_config.py`: **Utility**. Used by `comparison_app.py` to perform the actual Firestore upload via a subprocess.
*   `templates/`: HTML files for the UI (`admin.html`, `compare.html`).

## Common Tasks

### Adding a new config field
1.  Update `upload_config.py` to read/upload the new JSON file.
2.  Update `app_v2.py` to fetch it using `fetch_config()`.
3.  Update `templates/admin.html` to add an input field for it.

### Debugging Uploads
The Admin UI spawns a subprocess to run `upload_config.py`.
*   **stdout/stderr**: All output from this script is captured and printed to the `comparison_app.py` terminal.
*   **Exit Codes**: `upload_config.py` MUST exit with code `1` on failure for the UI to catch the error.
