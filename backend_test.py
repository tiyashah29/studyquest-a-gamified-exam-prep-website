import requests
import sys
import json
from datetime import datetime
import time

class StudyQuestAPITester:
    def __init__(self, base_url="https://tinyurl.com/studyquest-project"):
        self.base_url = base_url
        self.tokens = {}  # Store tokens for multiple users
        self.users = {}   # Store user data
        self.tests_run = 0
        self.tests_passed = 0
        self.quiz_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self, username, email, password):
        """Test user registration"""
        success, response = self.run_test(
            f"Register User ({username})",
            "POST",
            "auth/register",
            200,
            data={"username": username, "email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.tokens[username] = response['access_token']
            self.users[username] = response['user']
            return True
        return False

    def test_duplicate_registration(self, username, email, password):
        """Test duplicate registration should fail"""
        success, response = self.run_test(
            f"Duplicate Registration ({email})",
            "POST",
            "auth/register",
            400,
            data={"username": username, "email": email, "password": password}
        )
        return success

    def test_user_login(self, email, password, expected_username):
        """Test user login"""
        success, response = self.run_test(
            f"Login User ({email})",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.tokens[expected_username] = response['access_token']
            self.users[expected_username] = response['user']
            return True
        return False

    def test_invalid_login(self, email, password):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            f"Invalid Login ({email})",
            "POST",
            "auth/login",
            401,
            data={"email": email, "password": password}
        )
        return success

    def test_get_current_user(self, username):
        """Test getting current user info"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Get Current User ({username})",
            "GET",
            "auth/me",
            200,
            token=self.tokens[username]
        )
        return success

    def test_get_user_stats(self, username):
        """Test getting user stats"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Get User Stats ({username})",
            "GET",
            "user/stats",
            200,
            token=self.tokens[username]
        )
        return success

    def test_get_quizzes(self):
        """Test getting available quizzes"""
        success, response = self.run_test(
            "Get Available Quizzes",
            "GET",
            "quizzes",
            200
        )
        if success and isinstance(response, list):
            self.quiz_ids = [quiz['id'] for quiz in response if 'id' in quiz]
            print(f"   Found {len(self.quiz_ids)} quizzes")
        return success

    def test_get_quiz_details(self, quiz_id, username):
        """Test getting specific quiz details"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Get Quiz Details ({quiz_id[:8]}...)",
            "GET",
            f"quizzes/{quiz_id}",
            200,
            token=self.tokens[username]
        )
        return success

    def test_submit_quiz(self, quiz_id, username, answers, time_taken=120):
        """Test quiz submission"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Submit Quiz ({username})",
            "POST",
            "quiz/submit",
            200,
            data={
                "quiz_id": quiz_id,
                "answers": answers,
                "time_taken": time_taken
            },
            token=self.tokens[username]
        )
        return success

    def test_get_leaderboard(self, username):
        """Test getting leaderboard"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Get Leaderboard ({username})",
            "GET",
            "leaderboard",
            200,
            token=self.tokens[username]
        )
        return success

    def test_get_user_history(self, username):
        """Test getting user quiz history"""
        if username not in self.tokens:
            print(f"❌ No token for user {username}")
            return False
        
        success, response = self.run_test(
            f"Get User History ({username})",
            "GET",
            "user/history",
            200,
            token=self.tokens[username]
        )
        return success

def main():
    print("🚀 Starting StudyQuest API Testing...")
    tester = StudyQuestAPITester()
    
    # Test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_users = [
        {
            "username": f"testuser1_{timestamp}",
            "email": f"test1_{timestamp}@example.com",
            "password": "TestPass123!"
        },
        {
            "username": f"testuser2_{timestamp}",
            "email": f"test2_{timestamp}@example.com", 
            "password": "TestPass456!"
        },
        {
            "username": f"testuser3_{timestamp}",
            "email": f"test3_{timestamp}@example.com",
            "password": "TestPass789!"
        }
    ]

    print("\n" + "="*60)
    print("PHASE 1: USER AUTHENTICATION TESTING")
    print("="*60)

    # Test user registration
    for user in test_users:
        if not tester.test_user_registration(user["username"], user["email"], user["password"]):
            print(f"❌ Registration failed for {user['username']}, stopping tests")
            return 1

    # Test duplicate registration
    tester.test_duplicate_registration(test_users[0]["username"], test_users[0]["email"], test_users[0]["password"])

    # Test login
    for user in test_users:
        if not tester.test_user_login(user["email"], user["password"], user["username"]):
            print(f"❌ Login failed for {user['username']}")

    # Test invalid login
    tester.test_invalid_login("invalid@email.com", "wrongpassword")

    # Test get current user
    for user in test_users:
        tester.test_get_current_user(user["username"])

    print("\n" + "="*60)
    print("PHASE 2: QUIZ SYSTEM TESTING")
    print("="*60)

    # Test get quizzes
    if not tester.test_get_quizzes():
        print("❌ Failed to get quizzes, stopping quiz tests")
        return 1

    # Test get quiz details
    if tester.quiz_ids:
        for user in test_users[:2]:  # Test with first 2 users
            tester.test_get_quiz_details(tester.quiz_ids[0], user["username"])

    # Test quiz submission with different scores
    if tester.quiz_ids:
        quiz_id = tester.quiz_ids[0]
        
        # User 1: Perfect score (all correct answers = 1)
        tester.test_submit_quiz(quiz_id, test_users[0]["username"], [1, 1, 2, 2, 0], 180)
        
        # User 2: Good score (4/5 correct)
        tester.test_submit_quiz(quiz_id, test_users[1]["username"], [1, 1, 2, 0, 0], 240)
        
        # User 3: Average score (3/5 correct)
        tester.test_submit_quiz(quiz_id, test_users[2]["username"], [0, 1, 2, 2, 1], 300)

    print("\n" + "="*60)
    print("PHASE 3: USER STATS AND LEADERBOARD TESTING")
    print("="*60)

    # Test user stats after quiz submission
    for user in test_users:
        tester.test_get_user_stats(user["username"])

    # Test leaderboard
    for user in test_users:
        tester.test_get_leaderboard(user["username"])

    # Test user history
    for user in test_users:
        tester.test_get_user_history(user["username"])

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"📈 Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
