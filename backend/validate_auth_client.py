import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
import random

client = TestClient(app)
email = f'testuser+{random.randint(100000,999999)}@example.com'
register_payload = {
    'email': email,
    'full_name': 'Test User',
    'role': 'candidate',
    'password': 'TestPass123!'
}
print('register payload', register_payload)
resp = client.post('/register', json=register_payload)
print('register status', resp.status_code, resp.text)
assert resp.status_code == 201
login_resp = client.post('/login', json={'email': email, 'password': register_payload['password']})
print('login status', login_resp.status_code, login_resp.text)
assert login_resp.status_code == 200
access_token = login_resp.json()['access_token']
print('token', access_token)
update_resp = client.patch('/me', json={
    'phone': '9876543210',
    'location': 'Mumbai',
    'linkedin': 'https://linkedin.com/in/testuser',
    'github': 'https://github.com/testuser',
    'skills': 'React, Python',
    'about': 'Test user profile',
}, headers={'Authorization': f'Bearer {access_token}'})
print('update status', update_resp.status_code, update_resp.text)
assert update_resp.status_code == 200
me_resp = client.get('/me', headers={'Authorization': f'Bearer {access_token}'})
print('me status', me_resp.status_code, me_resp.text)
assert me_resp.status_code == 200
print('me json', me_resp.json())
