from flask import Flask, request, jsonify, render_template_string
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
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
from models import db, User, ChatMessage

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'the-circle-secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///the_circle.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS for React frontend
CORS(app, origins="*")

db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*")

with app.app_context():
    db.create_all()

# Initialize Murf clients
dub_api_key = os.getenv('MURFDUB_API_KEY')
if not dub_api_key:
    print("Warning: MURFDUB_API_KEY not found")
    murf_dub_client = None
else:
    try:
        murf_dub_client = MurfDub(api_key=dub_api_key)
        print(f"MurfDub client initialized successfully")
    except Exception as e:
        print(f"MurfDub client initialization error: {e}")
        murf_dub_client = None

# Store circle data
user_languages = {}
active_rooms = {}
circle_transcripts = {}

# Chat functionality
chat_rooms = {}
chat_messages = {}
user_sessions = {}

# Dubbing API
pending_jobs = {}

# Language mapping for Murf Dubbing API
DUBBING_LANGUAGE_MAP = {
    'en': 'en_US',
    'es': 'es_ES', 
    'fr': 'fr_FR',
    'de': 'de_DE',
    'it': 'it_IT',
    'nl': 'nl_NL',
    'pt': 'pt_BR',
    'zh': 'zh_CN',
    'ja': 'ja_JP',
    'ko': 'ko_KR',
    'hi': 'hi_IN',
    'ta': 'ta_IN',
    'bn': 'bn_IN',
    'pl': 'pl_PL'
}

# Google Translate language codes
TRANSLATE_LANGUAGE_MAP = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'nl': 'nl',
    'pt': 'pt',
    'zh': 'zh',
    'ja': 'ja',
    'ko': 'ko',
    'hi': 'hi',
    'ta': 'ta',
    'bn': 'bn',
    'pl': 'pl'
}

WEBHOOK_SECRET = "the-circle-webhook-secret"

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

# Serve React app for all routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>The Circle</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
        <div id="root"></div>
        <script>window.location.href = 'http://localhost:3000' + window.location.pathname;</script>
    </body>
    </html>
    ''')

# API endpoints for React frontend
@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.route('/api/rooms/<room_id>')
def get_room_info(room_id):
    return jsonify({
        'id': room_id,
        'name': f"Circle {room_id.split('-')[-1]}",
        'color': '#64ffda',
        'emoji': '🌍'
    })

@socketio.on('join_circle')
def handle_join_circle(data):
    room_id = data['room_id']
    username = data['username']
    language = data['language']
    
    with app.app_context():
        # Save/update user in database
        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(username=username, language=language)
            db.session.add(user)
            db.session.commit()
    
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
    
    with app.app_context():
        # Load chat history from database
        messages = ChatMessage.query.filter_by(room_id=room_id).order_by(ChatMessage.timestamp.desc()).limit(50).all()
        print(f"[DB] Found {len(messages)} messages for room {room_id}")
        
        text_messages = []
        voice_messages = []
        
        for msg in reversed(messages):
            if msg.message_type == 'voice':
                voice_messages.append({
                    'speaker': msg.username,
                    'audio_data': msg.audio_data,
                    'language': msg.language,
                    'timestamp': msg.timestamp.isoformat(),
                    'message_id': msg.message_uuid,
                    'source_language': msg.language,
                    'format': 'audio/webm'
                })
            else:
                text_messages.append({
                    'id': msg.message_uuid,
                    'username': msg.username,
                    'message': msg.message,
                    'timestamp': msg.timestamp.isoformat(),
                    'language': msg.language
                })
        
        if text_messages:
            print(f"[DB] Sending {len(text_messages)} text messages to client")
            emit('chat_history', {'messages': text_messages})
        
        if voice_messages:
            print(f"[DB] Sending {len(voice_messages)} voice messages to client")
            for voice_msg in voice_messages:
                emit('voice_message', voice_msg)
        
        if not text_messages and not voice_messages:
            print(f"[DB] No chat history found for room {room_id}")
    
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
    source_language = data.get('source_language', 'en')
    
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    # Validate audio data
    if not audio_data or len(audio_data) < 100:
        socketio.emit('error', {'message': 'Audio data too short or empty'}, room=request.sid)
        return
    
    message_id = f"msg_{int(datetime.now().timestamp() * 1000)}"
    
    with app.app_context():
        # Save voice message to database
        voice_msg = ChatMessage(
            room_id=room_id,
            username=speaker_name,
            message=None,
            language=source_language,
            message_uuid=message_id,
            message_type='voice',
            audio_data=audio_data
        )
        db.session.add(voice_msg)
        db.session.commit()
        print(f"[DB] Saved voice message: {speaker_name} in {room_id}")
        
        timestamp = voice_msg.timestamp.isoformat()
    
    print(f"[AUDIO] Received audio from {speaker_name}, size: {len(audio_data)} chars")
    
    # Send original voice message to all users in the room
    socketio.emit('voice_message', {
        'speaker': speaker_name,
        'audio_data': audio_data,
        'language': source_language,
        'timestamp': timestamp,
        'message_id': message_id,
        'source_language': source_language,
        'format': data.get('format', 'audio/webm')
    }, room=room_id)

def process_dubbing_for_user(audio_data, speaker_name, source_language, target_user, message_id=None):
    if not murf_dub_client:
        socketio.emit('dubbing_error', {
            'error': 'Service unavailable',
            'speaker': speaker_name
        }, room=target_user['sid'])
        return
    
    socketio.emit('dubbing_status', {
        'status': 'processing',
        'message': f'Translating {speaker_name}\'s voice...',
        'speaker': speaker_name
    }, room=target_user['sid'])
    
    def create_dubbing():
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file_path = temp_file.name
                audio_bytes = base64.b64decode(audio_data)
                temp_file.write(audio_bytes)
                temp_file.flush()
            
            target_locale = DUBBING_LANGUAGE_MAP.get(target_user['language'], 'en_US')
            
            with open(temp_file_path, "rb") as audio_file:
                response = murf_dub_client.dubbing.jobs.create(
                    target_locales=[target_locale],
                    file_name=f"voice_{speaker_name}_{int(datetime.now().timestamp())}",
                    file=audio_file,
                    priority="LOW"
                )
                
                if hasattr(response, 'job_id'):
                    pending_jobs[response.job_id] = {
                        'user_sid': target_user['sid'],
                        'speaker_name': speaker_name,
                        'target_language': target_user['language'],
                        'status': 'processing',
                        'created_at': datetime.now().isoformat(),
                        'message_id': message_id
                    }
                    
                    print(f"[DUBBING] Stored job info: {pending_jobs[response.job_id]}")
                    
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
            socketio.emit('dubbing_error', {
                'error': 'Dubbing service unavailable',
                'speaker': speaker_name
            }, room=target_user['sid'])
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
            if murf_dub_client and job_id in pending_jobs:
                print(f"[DUBBING] Polling job {job_id}, attempt {attempt + 1}")
                status_response = murf_dub_client.dubbing.jobs.get_status(job_id=job_id)
                print(f"[DUBBING] Status response: {status_response}")
                
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
                                        'target_language': job_info['target_language'],
                                        'message_id': job_info.get('message_id')
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
            
            print(f"[DUBBING] Waiting 5 seconds before next poll...")
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
    
    message_language = data.get('language') or user_info.get('circle_language', user_info.get('language', 'en'))
    message_id = str(uuid.uuid4())
    
    with app.app_context():
        # Save message to database
        chat_msg = ChatMessage(
            room_id=room_id,
            username=username,
            message=message_text,
            language=message_language,
            message_uuid=message_id
        )
        db.session.add(chat_msg)
        db.session.commit()
        print(f"[DB] Saved message: {username} in {room_id}: {message_text}")
        
        message = {
            'id': message_id,
            'username': username,
            'message': message_text,
            'timestamp': chat_msg.timestamp.isoformat(),
            'language': message_language
        }
    
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

@socketio.on('request_dub')
def handle_request_dub(data):
    message_id = data['message_id']
    audio_data = data['audio_data']
    speaker_name = data['speaker_name']
    source_language = data['source_language']
    target_language = data['target_language']  # Use target language from frontend
    
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    print(f"[DUB REQUEST] User {user_info['username']} requested dubbing:")
    print(f"  - Speaker: {speaker_name}")
    print(f"  - Source Language: {source_language}")
    print(f"  - Target Language: {target_language}")
    print(f"  - Message ID: {message_id}")
    print(f"  - Audio Data Size: {len(audio_data)} chars")
    
    # Process dubbing for the requesting user only
    process_dubbing_for_user(audio_data, speaker_name, source_language, {
        'sid': request.sid,
        'language': target_language
    }, message_id)

@socketio.on('set_circle_language')
def handle_set_circle_language(data):
    language = data['language']
    user_info = user_sessions.get(request.sid)
    
    if not user_info:
        emit('error', {'message': 'User not authenticated'})
        return
    
    user_info['circle_language'] = language
    user_sessions[request.sid] = user_info
    
    print(f"[CIRCLE_LANG] User {user_info['username']} set circle language to: {language}")
    emit('circle_language_updated', {'language': language})

@socketio.on('translate_text')
def handle_translate_text(data):
    text = data['text']
    source_language = data.get('source_language', 'en')
    message_id = data['message_id']
    
    user_info = user_sessions.get(request.sid)
    if not user_info:
        return
    
    target_language = user_info.get('circle_language', user_info.get('language', 'en'))
    
    print(f"[TRANSLATE] Text: {text}, Source: {source_language}, Target: {target_language}")
    
    if source_language == target_language:
        emit('translated_text', {
            'message_id': message_id,
            'translated_text': text,
            'audio_data': None,
            'target_language': target_language
        })
        return
    
    try:
        from deep_translator import GoogleTranslator
        
        source_lang = TRANSLATE_LANGUAGE_MAP.get(source_language, 'auto')
        target_lang = TRANSLATE_LANGUAGE_MAP.get(target_language, 'en')
        
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated_text = translator.translate(text)
        
        print(f"[TRANSLATE] Success: '{text}' -> '{translated_text}'")
        
        emit('translated_text', {
            'message_id': message_id,
            'translated_text': translated_text,
            'audio_data': None,
            'target_language': target_language
        })
        
    except Exception as e:
        print(f"[TRANSLATE] Failed: {str(e)}")
        emit('translated_text', {
            'message_id': message_id,
            'translated_text': f"Translation failed: {text}",
            'audio_data': None,
            'target_language': target_language
        })

@socketio.on('leave_circle')
def handle_leave_circle():
    user_info = user_sessions.get(request.sid)
    if user_info:
        room_id = user_info['room_id']
        username = user_info['username']
        
        leave_room(room_id)
        
        # Remove user from active rooms
        if room_id in active_rooms:
            active_rooms[room_id] = [user for user in active_rooms[room_id] 
                                    if user['sid'] != request.sid]
            
            # Notify others
            emit('user_left', {
                'username': username,
                'users': active_rooms[room_id]
            }, room=room_id)
        
        # Clean up session
        if request.sid in user_languages:
            del user_languages[request.sid]
        if request.sid in user_sessions:
            del user_sessions[request.sid]


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)