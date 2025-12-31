# Admin Dashboard Guide

The Admin Dashboard provides a user-friendly interface to manage the chatbot's knowledge base.

**URL**: `http://localhost:5000/admin` (when running `comparison_app.py`)

## Features

### 1. Class Schedule Editor
*   **Schedule String**: A free-form text area. This is EXACTLY what the AI reads. Paste your list of classes, dates, and times here.
*   **Note**: Contextual info for the AI, e.g., "All dates are for 2026".

### 2. Student FAQ Knowledge Base
A dynamic list of Keyword-Answer pairs to handle common questions instantly.
*   **Topic / Concern**: A unique ID for this issue (e.g., `login_issue`, `refund_policy`).
*   **Sounds Like / Keywords**: A comma-separated list of words searching for this topic.
    *   *Example*: `login, password, sign in, can't access`
*   **Official Answer**: The factual info the bot must convey. The bot will rephrase this naturally.
    *   *Example*: "The printer is next to the front desk. It costs $0.10 per page."

### 3. Actions
*   **Save Draft (Local)**: Saves your changes to `schedule.json` and `faq_student.json` on your computer. Does NOT update the live bot.
*   **Upload to Firestore**: Pushes your local changes to the live database.
    *   **Safety**: Triggers a confirmation modal to prevent accidental updates.
    *   **Feedback**: Shows a "Success" toast when complete, or an error message if something fails.

## Troubleshooting
If "Upload to Firestore" fails:
1.  Check the terminal running `comparison_app.py` for error logs.
2.  Ensure your internet connection is active (Firestore requires it).
3.  Ensure the `manychat-openai-integration-*.json` credential file is present in the root folder.
