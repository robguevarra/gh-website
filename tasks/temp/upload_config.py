import json
import os
from google.cloud import firestore
from google.oauth2 import service_account

# Global client - initialized only when needed
_db_client = None

def get_db_client():
    global _db_client
    if _db_client:
        return _db_client

    try:
        # Resolve absolute path to credentials to be safe
        cred_path = os.path.join(os.getcwd(), 'manychat-openai-integration-0cd06d7ced95.json')
        
        cred = service_account.Credentials.from_service_account_file(cred_path)
        _db_client = firestore.Client(credentials=cred)
        print("[INFO] Connected to Firestore")
        return _db_client
    except Exception as e:
        print(f"[ERROR] Error connecting to Firestore: {e}")
        raise e

def upload_json(file_path, collection, doc_id):
    """Uploads a local JSON file to a Firestore document."""
    try:
        db = get_db_client()
        
        abs_path = os.path.join(os.getcwd(), file_path)
        
        with open(abs_path, 'r') as f:
            data = json.load(f)
        
        # Firestore requires a Map (dict). If it's a list, wrap it.
        if isinstance(data, list):
            data = {'items': data}
            print(f"[INFO] Wrapped list data for {collection}/{doc_id}")

        doc_ref = db.collection(collection).document(doc_id)
        doc_ref.set(data)
        print(f"[INFO] Uploaded {file_path} to {collection}/{doc_id}")
        return True
    except Exception as e:
        print(f"[ERROR] Error uploading {file_path}: {e}")
        # Re-raise to let caller know
        raise e

if __name__ == "__main__":
    import sys
    # Test run
    try:
        # 2. Upload Schedule
        upload_json('schedule.json', 'config', 'bot_schedule')

        # 3. Upload FAQ
        upload_json('faq_student.json', 'config', 'student_faq')

        print("\n[SUCCESS] Configuration upload complete!")
    except Exception as e:
        print(f"Failed: {e}")
        sys.exit(1)
