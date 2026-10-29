import json
import random
import string
import urllib.request
import urllib.error

BASE_URL = 'http://127.0.0.1:8000'

def post(path, payload):
    req = urllib.request.Request(BASE_URL + path, data=json.dumps(payload).encode('utf-8'), method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def patch(path, payload, token):
    req = urllib.request.Request(BASE_URL + path, data=json.dumps(payload).encode('utf-8'), method='PATCH')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get(path, token):
    req = urllib.request.Request(BASE_URL + path, method='GET')
    req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


email = f'testuser+{random.randint(100000,999999)}@example.com'
payload = {
    'email': email,
    'full_name': 'Test User',
    'role': 'candidate',
    'password': 'TestPass123!'
}
print('Registering', email)
try:
    reg = post('/register', payload)
    print('register OK', reg)
except urllib.error.HTTPError as e:
    print('register failed', e.code, e.read().decode())
    raise

print('Logging in')
login = post('/login', {'email': email, 'password': payload['password']})
print('login OK', login)
token = login['access_token']

print('Updating profile')
updated = patch('/me', {
    'phone': '9876543210',
    'location': 'Mumbai',
    'linkedin': 'https://linkedin.com/in/testuser',
    'github': 'https://github.com/testuser',
    'skills': 'React, Python',
    'about': 'Test user profile',
}, token)
print('update OK', updated)

print('Fetching current user')
me = get('/me', token)
print('me OK', me)
