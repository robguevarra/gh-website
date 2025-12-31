from flask import Flask, render_template, request, jsonify
import requests
import json
import time
import os

app = Flask(__name__)

# Config
LIVE_V1_URL = "https://manychat-openai-service-587891812318.asia-southeast1.run.app/webhook"
LOCAL_V2_URL = "http://localhost:8081/webhook"

@app.route('/')
def index():
    return render_template('compare.html')

@app.route('/proxy/v1', methods=['POST'])
def proxy_v1():
    """Proxy request to Live V1 and measure latency."""
    data = request.json
    start = time.time()
    try:
        # We need to send 'user_id' and 'message' just like ManyChat does
        response = requests.post(LIVE_V1_URL, json=data, timeout=60)
        latency = round(time.time() - start, 2)
        
        if response.status_code == 200:
            result = response.json()
            result['latency'] = latency
            return jsonify(result)
        else:
            return jsonify({'error': f"Status {response.status_code}", 'latency': latency}), 500
    except Exception as e:
        latency = round(time.time() - start, 2)
        return jsonify({'error': str(e), 'latency': latency}), 500

@app.route('/proxy/v2', methods=['POST'])
def proxy_v2():
    """Proxy request to Local V2 and measure latency."""
    data = request.json
    start = time.time()
    try:
        # Call localhost app_v2
        response = requests.post(LOCAL_V2_URL, json=data, timeout=60)
        latency = round(time.time() - start, 2)
        
        if response.status_code == 200:
            result = response.json()
            result['latency'] = latency
            return jsonify(result)
        else:
            return jsonify({'error': f"Status {response.status_code}", 'latency': latency}), 500
    except Exception as e:
        latency = round(time.time() - start, 2)
        return jsonify({'error': str(e), 'latency': latency}), 500

# --- Admin Routes ---

@app.route('/admin')
def admin_page():
    try:
        with open('schedule.json', 'r') as f:
            schedule_json = f.read()
    except FileNotFoundError:
        schedule_json = "{}"
    
    try:
        with open('faq_student.json', 'r') as f:
            faq_json = f.read()
    except FileNotFoundError:
        faq_json = "{}"

    return render_template('admin.html', schedule_json=schedule_json, faq_json=faq_json)

@app.route('/api/save_config', methods=['POST'])
def save_config():
    data = request.json
    schedule = data.get('schedule')
    faq = data.get('faq')

    try:
        # Validate syntax
        json.loads(schedule)
        json.loads(faq)

        with open('schedule.json', 'w') as f:
            f.write(schedule)
        
        with open('faq_student.json', 'w') as f:
            f.write(faq)
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/upload_config', methods=['POST'])
def trigger_upload():
    try:
        # Use subprocess to run the script exactly as the user does manually
        import subprocess
        import sys
        
        # Run 'python upload_config.py'
        # sys.executable ensures we use the same python interpreter (venv)
        result = subprocess.run(
            [sys.executable, 'upload_config.py'], 
            capture_output=True, 
            text=True, 
            cwd=os.getcwd()
        )
        
        if result.returncode == 0:
            print(f"Subprocess Output: {result.stdout}")
            return jsonify({'success': True, 'output': result.stdout})
        else:
            # Capturing both because the script might print errors to stdout
            combined_output = f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            print(f"❌ Subprocess Failed (Code {result.returncode}):\n{combined_output}")
            return jsonify({'success': False, 'error': combined_output}), 500

    except Exception as e:
        print(f"Error during upload: {e}") 
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Comparison Interface on http://localhost:5000")
    app.run(port=5000, debug=True)
