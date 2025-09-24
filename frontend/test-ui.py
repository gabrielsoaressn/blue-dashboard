
import requests
import os
import json

# --- Configuration ---
API_BASE_URL = "http://localhost:3000/api"
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEST_FILE_PATH = os.path.join(PROJECT_ROOT, 'shared', 'exemplo-reuniao.txt')

# --- Test Functions ---

def test_health_check():
    """Tests if the backend health check endpoint is responding."""
    print("--- Running Frontend API Client Tests ---")
    print("Testing API health check...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        response.raise_for_status()  # Lança exceção para status HTTP 4xx/5xx
        assert response.json()['status'] == 'ok'
        print("✔ API Health Check passed")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ API Health Check failed: {e}")
        return False

def def test_file_upload():
    """Simulates a file upload and validates the response."""
    print("\nTesting file upload...")
    if not os.path.exists(TEST_FILE_PATH):
        print(f"❌ Test file not found at: {TEST_FILE_PATH}")
        return False

    try:
        with open(TEST_FILE_PATH, 'rb') as f:
            files = {'file': (os.path.basename(TEST_FILE_PATH), f, 'text/plain')}
            response = requests.post(f"{API_BASE_URL}/upload", files=files)
        
        response.raise_for_status()
        
        data = response.json()
        
        assert 'document' in data, "Response should contain 'document' key"
        assert 'tasks' in data, "Response should contain 'tasks' key"
        assert data['document']['name'] == os.path.basename(TEST_FILE_PATH)
        assert len(data['tasks']) >= 5, f"Expected at least 5 tasks, but got {len(data['tasks'])}"
        
        print(f"✔ File upload test passed: Found {len(data['tasks'])} tasks.")
        # print("Tasks found:")
        # print(json.dumps(data['tasks'], indent=2))
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ File upload test failed: {e}")
        if e.response:
            print(f"    Response body: {e.response.text}")
        return False
    except AssertionError as e:
        print(f"❌ Assertion failed: {e}")
        return False

# --- Main Execution ---

if __name__ == "__main__":
    print("Starting frontend tests...")
    
    health_ok = test_health_check()
    upload_ok = False
    if health_ok:
        upload_ok = test_file_upload()
    else:
        print("Skipping file upload test because health check failed.")

    print("\n---------------------")
    if health_ok and upload_ok:
        print("✅ All frontend tests passed!")
    else:
        print("❌ Some frontend tests failed.")
        exit(1)
