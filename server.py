import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', 8000))
DATA_FILE = 'users.json'

class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        parsed_path = urlparse(self.path)
        
        response = {'success': False, 'message': 'Unknown endpoint'}

        if parsed_path.path == '/api/signup':
            response = self.handle_signup(data)
        elif parsed_path.path == '/api/login':
            response = self.handle_login(data)
        elif parsed_path.path == '/api/score':
            response = self.handle_score(data)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/ranking':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            rankings = self.get_rankings()
            self.wfile.write(json.dumps(rankings).encode('utf-8'))
        else:
            # Serve static files
            super().do_GET()

    # --- Data Handling ---
    def load_users(self):
        if not os.path.exists(DATA_FILE):
            return {}
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}

    def save_users(self, users):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)

    def handle_signup(self, data):
        users = self.load_users()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return {'success': False, 'message': 'Missing fields'}
        
        if username in users:
            return {'success': False, 'message': 'Username already exists'}
        
        users[username] = {
            'username': username,
            'password': password,
            'bestScore': 0,
            'joinDate': ''
        }
        self.save_users(users)
        return {'success': True, 'message': 'Signup successful'}

    def handle_login(self, data):
        users = self.load_users()
        username = data.get('username')
        password = data.get('password')
        
        if username not in users or users[username]['password'] != password:
            return {'success': False, 'message': 'Invalid credentials'}
        
        return {'success': True, 'message': 'Login successful', 'user': users[username]}

    def handle_score(self, data):
        users = self.load_users()
        username = data.get('username')
        score = data.get('score')
        
        if username in users:
            if score > users[username]['bestScore']:
                users[username]['bestScore'] = score
                self.save_users(users)
                return {'success': True, 'updated': True}
        
        return {'success': True, 'updated': False}

    def get_rankings(self):
        users = self.load_users()
        user_list = list(users.values())
        # Sort by bestScore desc
        user_list.sort(key=lambda x: x['bestScore'], reverse=True)
        # Return top 5, remove password
        top5 = []
        for u in user_list[:5]:
            top5.append({'username': u['username'], 'score': u['bestScore']})
        return top5

print(f"Serving at port {PORT}")
http.server.HTTPServer(('', PORT), GameRequestHandler).serve_forever()
