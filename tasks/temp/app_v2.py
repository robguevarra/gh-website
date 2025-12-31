import os
import time
import json
import logging
import threading
from flask import Flask, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask App
app = Flask(__name__)

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Clients
# Ensure OPENAI_API_KEY is set in environment variables
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# MOCK DB for Local Testing (Avoids Google Auth issues)
SESSIONS = {}

# Configuration
MAX_HISTORY_LENGTH = 10
SESSION_TIMEOUT = 86400  # 24 hours

# --- Caching (Optimization) ---
CONFIG_CACHE = {}
CACHE_TTL = 300  # Reload config every 5 minutes

# --- Dynamic Configuration (Firestore) ---
def fetch_config(doc_id, default_value=None):
    """Fetches a config document from Firestore with Caching."""
    
    # 1. Check Cache
    ctx = CONFIG_CACHE.get(doc_id)
    if ctx and (time.time() - ctx['timestamp'] < CACHE_TTL):
        return ctx['data']

    if db is None:
        # Fallback to local file if DB fails
        try:
            filename = 'schedule.json' if 'schedule' in doc_id else 'faq_student.json'
            with open(filename, 'r') as f:
                return json.load(f)
        except:
            return default_value

    try:
        # 2. Network Call (Only if cache expired)
        doc = db.collection('config').document(doc_id).get()
        if doc.exists:
            data = doc.to_dict()
            # Update Cache
            CONFIG_CACHE[doc_id] = {
                'data': data,
                'timestamp': time.time()
            }
            print(f"🔄 Config '{doc_id}' refreshed from Firestore.")
            return data
        return default_value
    except Exception as e:
        print(f"⚠️ Error fetching config {doc_id}: {e}")
        return default_value

# --- System Prompt Definition (Dynamic) ---
def get_system_prompt():
    # 1. Fetch Schedule
    schedule_data = fetch_config('bot_schedule', {})
    schedule_text = f"{schedule_data.get('schedule', 'Check FB Group')} {schedule_data.get('schedule_note', '')}"

    return f'''You are a friendly, encouraging, and persuasive sales assistant for Graceful Homeschooling.
Your Goal: Convert inquiries into students for the "Papers to Profits" course.

**CORE PRINCIPLES (Apply to ALL responses):**
1. **Empathy First**: Always acknowledge the user's feeling or situation before jumping to business.
2. **Accuracy**: Stick to the provided facts. Do not guess links or dates.
3. **Conciseness**: Avoid walls of text. Use bullet points. Keep it easy to read on a phone.
4. **Link Hygiene**: ONLY provide the enrollment link if the user acts interested (prompts for price, asking how to join) or explicitly asks. Do NOT attach links to general answers.

**OPERATIONAL CONTEXT:**
- **Office Hours**: Monday to Friday, 8:00 AM - 6:00 PM (Manila Time).
- **Weekends/Holidays**: Operations are closed. Admin approval/replies will resume on the next business day.
- **Response Time**: Standard email/approval time is 24-48 hours.

**CRITICAL RULE: LANGUAGE MIRRORING**
- If user speaks **Tagalog/Taglish**, you MUST reply in **Taglish**.
- If user speaks **English**, reply in **English**.
- NEVER reply in English if the user is speaking Tagalog.
- **Tone**: Warm, Professional, & Encouraging (Gender Neutral). Do NOT assume gender (no "Kapwa Nanay").

**KNOWLEDGE BASE:**
1. **"Papers to Profits" (P2P) Course** - ₱1,300 (Lifetime Access)
    - What it is: A step-by-step masterclass on starting a home-based printing business.
    - Inclusions:
        - 20+ Step-by-step video guides (Module-based).
        - Weekly live classes 
        - Exclusive Community access (**Join 4,000+ students**).
        - Free 100+ digital resources & designs. (Printables, Canva templates, etc.)
        - **Access to Partner Printer**: They produce the physical products for you. This means you can start your business WITHOUT buying expensive equipment.
    - URL: https://www.gracefulhomeschooling.com/p2p-order-form
2. Faith-Based Paper Products: Journals, notebooks, SOAP notebooks.
3. Canva eBook (₱49) - STANDALONE PRODUCT:
    - Teaches **how to start their home-based printing business using Canva**.
    - This is a separate product from "Papers to Profits".
    - URL: https://www.gracefulhomeschooling.com/canva-order

**SALES STRATEGY (The "Hormozi" Approach):**
1. **Sell the Dream, Hide the Sweat**:
    - Focus on: "Starting a business", "Earning from home", "No expensive equipment".
    - **Do NOT mention**: "Shipping", "Packaging", "File Transfers", "Modules" unless explicitly asked. These sound like work and add friction.
2. **Simplified Partner Printer**:
    - Say this: "Think of them as your production team. You design it, they print it. It lets you start without buying a ₱20k printer."
3. **The Close (Decision Support)**:
    - **Bad Close**: "Do you want to know about file transfers?" (Boring/Technical).
    - **Good Close**: "What's the main thing holding you back from starting today?" (Uncovers objections).
    - **Good Close**: "Ready to turn your creativity into income?" (Assumptive).
4. **Contextual Answers**: If "Interested", just give the **Hook**, **Link**, and a **Good Close**.

**Objection Handling Rules**:
- "Mahal?" -> Break it down: "₱1,300 is a lifetime investment. That's less than the cost of one printer ink cartridge."
- "No equipment?" -> "Exactly! That's why we have the Partner Printer. You don't need equipment."
- "What if I'm busy?" -> "It's self-paced. format. You can watch anytime."

Reference Info (Use ONLY if asked):
- Schedule Details: {schedule_text}

Sample Responses (Model these):

Interest in Business / "Paano gumagana?":
    Taglish: "Hello po! 😊 Ang 'Papers to Profits' course ay tutulong sa inyong magsimula ng **Home-Based Printing Business**. Mayroon kaming partner printer kaya hindi niyo kailangan bumili agad ng equipment! Pwede na kayong mag-enroll dito: https://www.gracefulhomeschooling.com/p2p-order-form"

Price Objection ("Ang mahal naman"):
    Taglish: "I understand po, malaking bagay ang budget. 😊 Pero sa ₱1,300, **lifetime access** na po ito. Kasama na ang videos, live classes, at partner printer access. Investment po ito para sa sariling negosyo wthat can grow. Gusto niyo po bang i-try?"

Capital/Equipment Objection:
    Taglish: "Don't worry po! 🚀 Mayroon kaming **partner printer** na magpi-print ng designs niyo. Kayo lang ang bahala sa shipping. Low risk, high reward. Start your business today!"

Output Format (JSON):
- "reply": (string) Persuasive response. Match user's language.
- "intent": (string) Intent category.
- "escalate": (boolean)
- "send_enroll_link": (boolean) True if pitching the course.
'''



# --- Helper Functions ---

# --- Firestore Initialization (Sandbox Mode) ---
try:
    from google.cloud import firestore
    from google.oauth2 import service_account

    # Load credentials from the file you just downloaded
    cred = service_account.Credentials.from_service_account_file(
        'manychat-openai-integration-0cd06d7ced95.json'
    )
    db = firestore.Client(credentials=cred)
    print("✅ Connected to Firestore (Sandbox Mode)")
except Exception as e:
    print(f"⚠️ Error initializing Firestore: {e}")
    db = None

# --- Helper Functions ---

def get_conversation_data(user_id):
    """Retrieve conversation history from Firestore (Sandbox Collection)."""
    if db is None:
        # Fallback to in-memory SESSIONS if DB fails
        return SESSIONS.get(user_id, {'history': [], 'last_active': time.time()})
    
    # USE SANDBOX COLLECTION
    doc_ref = db.collection('conversations_v2_TEST').document(user_id)
    doc = doc_ref.get()
    
    if doc.exists:
        return doc.to_dict()
    else:
        return {
            'history': [],
            'last_active': time.time()
        }

def save_conversation_data(user_id, data):
    """Save conversation history to Firestore (Sandbox Collection)."""
    if db is None:
        SESSIONS[user_id] = data
        return
        
    doc_ref = db.collection('conversations_v2_TEST').document(user_id)
    doc_ref.set(data)

def trim_history(history):
    """Keep only the last N messages."""
    if len(history) > MAX_HISTORY_LENGTH:
        return history[-MAX_HISTORY_LENGTH:]
    return history

def is_session_active(last_active):
    """Check if the session has timed out."""
    return (time.time() - last_active) < SESSION_TIMEOUT

# --- Main Route ---

@app.route('/webhook', methods=['POST'])
def webhook():
    start_time = time.time()
    
    # 1. Parse Request
    data = request.get_json()
    user_id = data.get('user_id')
    user_message = data.get('message')

    if not user_id or not user_message:
        return jsonify({'error': 'Invalid request'}), 400

    user_message = str(user_message).strip()
    logging.info(f"User {user_id}: {user_message}")

    # 2. Manage Session & History
    conversation_data = get_conversation_data(user_id)
    history = conversation_data.get('history', [])
    last_active = conversation_data.get('last_active', 0)

    # Reset if timeout
    if not is_session_active(last_active):
        history = []
    
    # Update state
    conversation_data['last_active'] = time.time()
    history.append({'role': 'user', 'content': user_message})
    history = trim_history(history)

    # 3. Construct Payload for OpenAI
    dynamic_system_prompt = get_system_prompt()
    system_messages = [{"role": "system", "content": dynamic_system_prompt}]
    
    # --- INTELLIGENT ROUTING (The "Dual Brain" System) ---
    model_name = "gpt-5-mini" # Default: High IQ Sales Brain
    faq_injected = False

    try:
        faq_data = fetch_config('student_faq', []) # Expecting a LIST now
        user_msg_lower = user_message.lower()
        
        # Helper: Unwrap if it's the new wrapped list format
        if isinstance(faq_data, dict) and 'items' in faq_data:
            faq_data = faq_data['items']

        # Check if data is list (backward compatibility test)
        if isinstance(faq_data, dict):
            # Fallback if someone uploaded the really old simple dict format
            # Or if the unwrap failed
            logging.warning("Receive dict for FAQ (old format or missing 'items'). Skipping smart triggers.")
        else:
            for item in faq_data:
                triggers = item.get('triggers', [])
                intent = item.get('intent', 'unknown')
                answer = item.get('answer', '')

                # Improved Matcher: Check ANY trigger
                if any(t in user_msg_lower for t in triggers):
                    # FAQ Match Found!
                    
                    # 1. Inject Context with Formatting Rules
                    special_instruction = (
                        f"USER INTENT: {intent}\n"
                        f"FACTUAL ANSWER: {answer}\n\n"
                        "INSTRUCTIONS:\n"
                        "1. Empathy First: Acknowledge the frustration/need briefly.\n"
                        "2. Solution: Provide the FACTUAL ANSWER above. Use bullet points (-) if there are steps.\n"
                        "3. Formatting: Keep it visually clean. No large blocks of text.\n"
                        "4. Confirmation: If the user's request is vague, ask a confirming question before solving."
                    )
                    system_messages.append({"role": "system", "content": special_instruction})
                    
                    # 2. Switch to FAST Brain
                    model_name = "gpt-4o-mini" 
                    faq_injected = True
                    
                    logging.info(f"💉 FAQ Injected ({intent}) -> Switching to Fast Model ({model_name})")
                    break

    except Exception as e:
        logging.error(f"FAQ Injection Failed: {e}")
    # -----------------------------------------------------

    messages = system_messages + history
    logging.info(f"🤖 Model Selected: {model_name}")

    try:
        # SINGLE CALL: Logic + Reply
        # Dynamically build kwargs to support both 4o and 5-mini parameters safeley
        # RE-WRITING CALL TO BE SAFE WITH KWARGS
        api_kwargs = {
            "model": model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "max_completion_tokens": 2000
        }
        
        if model_name == "gpt-5-mini":
            api_kwargs["reasoning_effort"] = "low"
        else:
            api_kwargs["temperature"] = 0.7 

        response = client.chat.completions.create(**api_kwargs)
        
        content = response.choices[0].message.content
        logging.info(f"RAW OPENAI RESPONSE: {content}")

        if not content:
             raise ValueError("OpenAI returned empty content.")

        content = content.strip()
        # Markdown cleanup...
        if content.startswith("```json"): content = content[7:]
        elif content.startswith("```"): content = content[3:]
        if content.endswith("```"): content = content[:-3]

        parsed_content = json.loads(content)
        
        reply = parsed_content.get("reply", "I'm sorry, I'm having trouble processing that right now.")
        intent = parsed_content.get("intent", "Unrecognized Query")
        escalate = parsed_content.get("escalate", False)
        send_enroll_link = parsed_content.get("send_enroll_link", False)

        logging.info(f"AI Reply: {reply} | Intent: {intent} | Escalate: {escalate}")

        # Update history
        history.append({'role': 'assistant', 'content': reply})
        conversation_data['history'] = history
        save_conversation_data(user_id, conversation_data)
        
        return jsonify({
            'reply': reply,
            'intent': intent,
            'escalate': escalate,
            'send_enroll_link': send_enroll_link
        })

    except Exception as e:
        logging.error(f"Error processing request: {e}")
        return jsonify({'reply': "I'm currently experiencing high traffic. Please try again later.", 'error': str(e)}), 500

if __name__ == '__main__':
    # Run on port specifically defined by env (Cloud Run uses 8080) or 8081 for local
    port = int(os.environ.get('PORT', 8081))
    print(f"Starting app_v2 on port {port}")
    app.run(host='0.0.0.0', port=port)
