from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import tempfile
import base64
import requests
from murf import MurfDub, Murf
from murf.utils import validate_hmac
from dotenv import load_dotenv
import json
import uuid
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'meeting-translator-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Murf clients
api_key = os.getenv('MURF_API_KEY')
if not api_key:
    print("Warning: MURF_API_KEY not found")
    murf_client = None
    tts_client = None
else:
    try:
        murf_client = MurfDub(api_key=api_key)
        tts_client = Murf(api_key=api_key)
        print(f"Murf clients initialized successfully")
    except Exception as e:
        print(f"Murf client initialization error: {e}")
        murf_client = None
        tts_client = None

# Store meeting data
user_languages = {}
active_rooms = {}
meeting_transcripts = {}

# Chat functionality
chat_rooms = {}
chat_messages = {}
user_sessions = {}

# Dubbing API
pending_jobs = {}

# Language mapping for Murf API
LANGUAGE_MAP = {
    'en': 'en_US',
    'es': 'es_ES', 
    'fr': 'fr_FR',
    'ja': 'ja_JP',
    'hi': 'hi_IN'
}

WEBHOOK_SECRET = "meeting-translator-webhook-secret"

# Murf API error handling
def handle_murf_error(error, speaker_name, user_sid):
    error_msg = str(error)
    user_friendly_msg = "Translation failed"
    
    if "INSUFFICIENT_CREDITS" in error_msg or "CREDITS_EXHAUSTED" in error_msg:
        user_friendly_msg = "Translation service credits exhausted"
    elif "LANGUAGE_NOT_SUPPORTED" in error_msg:
        user_friendly_msg = "Language not supported for translation"
    elif "SPEECH_NOT_PRESENT" in error_msg:
        user_friendly_msg = "No speech detected in audio"
    elif "SOURCE_LANGUAGE_MISMATCH" in error_msg:
        user_friendly_msg = "Source language mismatch"
    elif "SERVER_ERROR" in error_msg:
        user_friendly_msg = "Translation server error"
    
    socketio.emit('dubbing_error', {
        'error': user_friendly_msg,
        'speaker': speaker_name
    }, room=user_sid)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/room/<room_id>')
def room(room_id):
    return render_template('room.html', room_id=room_id)

@socketio.on('join_circle')
def handle_join_circle(data):
    room_id = data['room_id']
    username = data['username']
    language = data['language']
    
    join_room(room_id)
    user_languages[request.sid] = language
    
    user_sessions[request.sid] = {
        'username': username,
        'room_id': room_id,
        'language': language
    }
    
    if room_id not in active_rooms:
        active_rooms[room_id] = []
    
    if room_id not in chat_rooms:
        chat_rooms[room_id] = {'messages': [], 'participants': []}
        chat_messages[room_id] = []
    
    active_rooms[room_id] = [user for user in active_rooms[room_id] 
                            if user['username'] != username]
    
    active_rooms[room_id].append({
        'sid': request.sid,
        'username': username,
        'language': language
    })
    
    if chat_messages[room_id]:
        emit('chat_history', {
            'messages': chat_messages[room_id][-50:]
        })
    
    emit('user_joined', {
        'username': username,
        'language': language,
        'users': active_rooms[room_id]
    }, room=room_id)

@socketio.on('disconnect')
def handle_disconnect():
    user_info = user_sessions.get(request.sid)
    
    for room_id in active_rooms:
        active_rooms[room_id] = [user for user in active_rooms[room_id] 
                                if user['sid'] != request.sid]
        
        emit('user_left', {
            'users': active_rooms[room_id]
        }, room=room_id)
    
    if request.sid in user_languages:
        del user_languages[request.sid]
    if request.sid in user_sessions:
        del user_sessions[request.sid]

@socketio.on('audio_data')
def handle_meeting_audio(data):
    room_id = data['room_id']
    audio_data = data['audio']
    speaker_name = data['username']
    
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    speaker_language = user_info['language']
    timestamp = datetime.now().isoformat()
    
    room_users = active_rooms.get(room_id, [])
    
    for user in room_users:
        if user['sid'] != request.sid:
            if user['language'] == speaker_language:
                socketio.emit('voice_message', {
                    'speaker': speaker_name,
                    'audio_data': audio_data,
                    'language': speaker_language,
                    'timestamp': timestamp
                }, room=user['sid'])
            else:
                process_dubbing_for_user(audio_data, speaker_name, speaker_language, user)

def process_dubbing_for_user(audio_data, speaker_name, source_language, target_user):
    # Emit queued status immediately
    print(f"[DUBBING] Queuing translation for {speaker_name} -> {target_user['language']}")
    socketio.emit('dubbing_status', {
        'status': 'queued',
        'message': f'Queuing translation for {speaker_name}...',
        'speaker': speaker_name
    }, room=target_user['sid'])
    
    def create_dubbing():
        temp_file_path = None
        try:
            if not murf_client:
                socketio.emit('dubbing_error', {
                    'error': 'Translation service not available',
                    'speaker': speaker_name
                }, room=target_user['sid'])
                return
                
            if murf_client:
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_file_path = temp_file.name
                    audio_bytes = base64.b64decode(audio_data)
                    temp_file.write(audio_bytes)
                    temp_file.flush()
                
                target_locale = LANGUAGE_MAP.get(target_user['language'], 'en_US')
                
                with open(temp_file_path, "rb") as audio_file:
                    response = murf_client.dubbing.jobs.create(
                        target_locales=[target_locale],
                        file_name=f"voice_{speaker_name}_{int(datetime.now().timestamp())}",
                        file=audio_file,
                        priority="HIGH"
                    )
                
                if hasattr(response, 'job_id'):
                    pending_jobs[response.job_id] = {
                        'user_sid': target_user['sid'],
                        'speaker_name': speaker_name,
                        'target_language': target_user['language'],
                        'status': 'processing',
                        'created_at': datetime.now().isoformat()
                    }
                    
                    print(f"[DUBBING] Job created: {response.job_id} for {speaker_name}")
                    socketio.emit('dubbing_status', {
                        'status': 'processing',
                        'message': f'Translating {speaker_name}\'s voice...',
                        'speaker': speaker_name,
                        'job_id': response.job_id
                    }, room=target_user['sid'])
                    
                    socketio.start_background_task(poll_job_status, response.job_id)
                else:
                    socketio.emit('dubbing_error', {
                        'error': 'Failed to create translation job',
                        'speaker': speaker_name
                    }, room=target_user['sid'])
                    
        except Exception as e:
            error_str = str(e)
            print(f"[DUBBING] Full error: {error_str}")
            
            # Check for specific Murf API errors
            if "INSUFFICIENT_CREDITS" in error_str:
                print("[DUBBING] Error: Insufficient credits")
            elif "CREDITS_EXHAUSTED" in error_str:
                print("[DUBBING] Error: Credits exhausted")
            elif "LANGUAGE_NOT_SUPPORTED" in error_str:
                print("[DUBBING] Error: Language not supported")
            elif "SPEECH_NOT_PRESENT" in error_str:
                print("[DUBBING] Error: No speech detected")
            elif "SOURCE_LANGUAGE_MISMATCH" in error_str:
                print("[DUBBING] Error: Source language mismatch")
            elif "SERVER_ERROR" in error_str:
                print("[DUBBING] Error: Server error")
            
            handle_murf_error(e, speaker_name, target_user['sid'])
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    socketio.start_background_task(create_dubbing)

def poll_job_status(job_id):
    import time
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            if murf_client and job_id in pending_jobs:
                status_response = murf_client.dubbing.jobs.get_status(job_id=job_id)
                
                if hasattr(status_response, 'status'):
                    job_info = pending_jobs[job_id]
                    
                    print(f"[DUBBING] Job {job_id} status: {status_response.status}")
                    if status_response.status == 'COMPLETED':
                        if hasattr(status_response, 'download_details') and status_response.download_details:
                            download_url = status_response.download_details[0].download_url
                            print(f"[DUBBING] Job {job_id} completed, downloading audio")
                            
                            # Download and convert audio to base64 for browser playback
                            try:
                                import requests
                                audio_response = requests.get(download_url, timeout=30)
                                if audio_response.status_code == 200:
                                    audio_base64 = base64.b64encode(audio_response.content).decode('utf-8')
                                    
                                    socketio.emit('translated_audio', {
                                        'audio_data': audio_base64,
                                        'speaker': job_info['speaker_name'],
                                        'target_language': job_info['target_language']
                                    }, room=job_info['user_sid'])
                                else:
                                    socketio.emit('dubbing_error', {
                                        'error': 'Failed to download translated audio',
                                        'speaker': job_info['speaker_name']
                                    }, room=job_info['user_sid'])
                            except Exception as e:
                                print(f"Audio download error: {e}")
                                socketio.emit('dubbing_error', {
                                    'error': 'Failed to process translated audio',
                                    'speaker': job_info['speaker_name']
                                }, room=job_info['user_sid'])
                        
                        del pending_jobs[job_id]
                        break
                    elif status_response.status == 'FAILED':
                        socketio.emit('dubbing_error', {
                            'error': 'Translation job failed',
                            'speaker': job_info['speaker_name']
                        }, room=job_info['user_sid'])
                        del pending_jobs[job_id]
                        break
            
            time.sleep(5)
            attempt += 1
            
        except Exception as e:
            print(f"Job polling error: {e}")
            if job_id in pending_jobs:
                job_info = pending_jobs[job_id]
                handle_murf_error(e, job_info['speaker_name'], job_info['user_sid'])
                del pending_jobs[job_id]
            break

@socketio.on('send_message')
def handle_send_message(data):
    user_info = user_sessions.get(request.sid)
    if not user_info:
        emit('error', {'message': 'User not authenticated'})
        return
    
    room_id = user_info['room_id']
    username = user_info['username']
    message_text = data.get('message', '').strip()
    
    if not message_text:
        emit('error', {'message': 'Message cannot be empty'})
        return
    
    message = {
        'id': str(uuid.uuid4()),
        'username': username,
        'message': message_text,
        'timestamp': datetime.now().isoformat(),
        'language': user_info['language']
    }
    
    if room_id not in chat_messages:
        chat_messages[room_id] = []
    chat_messages[room_id].append(message)
    
    emit('new_message', message, room=room_id)

@socketio.on('typing')
def handle_typing(data):
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    room_id = user_info['room_id']
    username = user_info['username']
    is_typing = data.get('typing', False)
    
    emit('user_typing', {
        'username': username,
        'typing': is_typing
    }, room=room_id, include_self=False)

@socketio.on('get_pending_jobs')
def handle_get_pending_jobs():
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    user_jobs = []
    for job_id, job_info in pending_jobs.items():
        if job_info['user_sid'] == request.sid:
            user_jobs.append({
                'job_id': job_id,
                'speaker': job_info['speaker_name'],
                'status': job_info.get('status', 'processing'),
                'created_at': job_info.get('created_at')
            })
    
    emit('pending_jobs_list', {'jobs': user_jobs})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)