"""Test script to debug authentication issue"""
import requests

# Test 1: Login to get token
print("=== Test 1: Login ===")
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "demo@prozapas.local", "password": "demo"}
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    token_data = response.json()
    access_token = token_data.get("access_token")
    print(f"Got token: {access_token[:50]}...")
    
    # Test 2: Use token to get items
    print("\n=== Test 2: Get items with token ===")
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(
        "http://localhost:8000/api/spaces/1/items",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
else:
    print(f"Login failed: {response.json()}")
