import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.models import db, User, Task, CalendarEvent, StudySession, FlashcardDeck, Flashcard

class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret-at-least-32-bytes-long-for-testing"
    JWT_SECRET_KEY = "test-jwt-secret-at-least-32-bytes-long-student"
    JWT_EXPIRATION_DAYS = 1
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GEMINI_API_KEY = ""
    PORT = 5001

class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def register_and_login(self, email="student@university.edu", password="password123", name="Alex Student"):
        res = self.client.post("/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name
        })
        self.assertEqual(res.status_code, 201)
        token = res.get_json()["data"]["token"]
        return token, {"Authorization": f"Bearer {token}"}

    def test_auth_flow(self):
        # 1. Register a new user
        token, headers = self.register_and_login(
            email="john@university.edu",
            password="securepassword123",
            name="John Doe"
        )
        self.assertIsNotNone(token)
        
        # 2. Access protected endpoint with token
        res_me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        data = res_me.get_json()["data"]
        self.assertEqual(data["user"]["email"], "john@university.edu")
        self.assertEqual(data["user"]["name"], "John Doe")

        # 3. Log in with newly registered credentials (email)
        res_login_email = self.client.post("/api/auth/login", json={
            "email": "john@university.edu",
            "password": "securepassword123"
        })
        self.assertEqual(res_login_email.status_code, 200)
        self.assertIn("token", res_login_email.get_json()["data"])
        login_token = res_login_email.get_json()["data"]["token"]

        # 4. Log in using student name (case-insensitive identifier support)
        res_login_name = self.client.post("/api/auth/login", json={
            "email": "john doe",
            "password": "securepassword123"
        })
        self.assertEqual(res_login_name.status_code, 200)
        self.assertIn("token", res_login_name.get_json()["data"])

        # 5. Attempt login with incorrect password -> 401
        res_bad_pw = self.client.post("/api/auth/login", json={
            "email": "john@university.edu",
            "password": "wrongpassword"
        })
        self.assertEqual(res_bad_pw.status_code, 401)
        self.assertEqual(res_bad_pw.get_json()["error"], "Invalid email or password.")

        # 6. Attempt login with unregistered email -> 401
        res_unreg = self.client.post("/api/auth/login", json={
            "email": "unregistered@university.edu",
            "password": "securepassword123"
        })
        self.assertEqual(res_unreg.status_code, 401)
        self.assertEqual(res_unreg.get_json()["error"], "Invalid email or password.")

        # 7. Access protected endpoint without token -> 401
        res_no_token = self.client.get("/api/auth/me")
        self.assertEqual(res_no_token.status_code, 401)

        # 8. Access protected endpoint with invalid token -> 401
        res_invalid_token = self.client.get("/api/auth/me", headers={"Authorization": "Bearer fake.invalid.token"})
        self.assertEqual(res_invalid_token.status_code, 401)

    def test_tasks_crud_and_kanban(self):
        _, headers = self.register_and_login()

        # Create Task
        res = self.client.post("/api/tasks", headers=headers, json={
            "title": "Complete Algorithms Assignment",
            "description": "Implement Dijkstra and A* search",
            "priority": "high",
            "category": "Coding",
            "due_date": "2026-09-25",
            "status": "todo"
        })
        self.assertEqual(res.status_code, 201)
        task_id = res.get_json()["data"]["id"]

        # Get Tasks
        res_list = self.client.get("/api/tasks", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        tasks = res_list.get_json()["data"]
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["title"], "Complete Algorithms Assignment")

        # Update Task Status (Simulating Kanban Drag and Drop)
        res_update = self.client.put(f"/api/tasks/{task_id}", headers=headers, json={
            "status": "inprogress"
        })
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.get_json()["data"]["status"], "inprogress")

        # Delete Task
        res_del = self.client.delete(f"/api/tasks/{task_id}", headers=headers)
        self.assertEqual(res_del.status_code, 200)
        res_empty = self.client.get("/api/tasks", headers=headers)
        self.assertEqual(len(res_empty.get_json()["data"]), 0)

    def test_calendar_crud(self):
        _, headers = self.register_and_login()

        # Create Calendar Event
        res = self.client.post("/api/calendar", headers=headers, json={
            "title": "Operating Systems Midterm",
            "description": "Chapters 1 to 5",
            "date": "2026-09-28",
            "start_time": "14:00",
            "end_time": "16:00",
            "category": "Exams"
        })
        self.assertEqual(res.status_code, 201)
        evt_id = res.get_json()["data"]["id"]

        # List events
        res_list = self.client.get("/api/calendar", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        events = res_list.get_json()["data"]
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["category"], "Exams")

        # Toggle Event
        res_toggle = self.client.post(f"/api/calendar/{evt_id}/toggle", headers=headers)
        self.assertEqual(res_toggle.status_code, 200)
        self.assertTrue(res_toggle.get_json()["data"]["completed"])

    def test_pomodoro_session_and_analytics(self):
        _, headers = self.register_and_login()

        # Log focus session
        res = self.client.post("/api/sessions", headers=headers, json={
            "duration_minutes": 25,
            "session_type": "focus",
            "topic": "Neural Networks"
        })
        self.assertEqual(res.status_code, 201)

        # Get analytics
        res_an = self.client.get("/api/analytics", headers=headers)
        self.assertEqual(res_an.status_code, 200)
        data = res_an.get_json()["data"]
        self.assertEqual(data["overview"]["today_study_minutes"], 25)
        self.assertEqual(data["overview"]["sessions_today"], 1)
        self.assertEqual(data["overview"]["current_streak"], 1)

    def test_flashcards_and_study_mode(self):
        _, headers = self.register_and_login()

        # Create Deck
        res_deck = self.client.post("/api/flashcards/decks", headers=headers, json={
            "title": "Database Systems",
            "description": "Relational algebra and SQL internals",
            "color": "#10b981"
        })
        self.assertEqual(res_deck.status_code, 201)
        deck_id = res_deck.get_json()["data"]["id"]

        # Create Flashcard
        res_card = self.client.post("/api/flashcards", headers=headers, json={
            "deck_id": deck_id,
            "question": "What does Atomicity mean in ACID?",
            "answer": "All changes to data are performed as if they are a single operation.",
            "topic": "Databases",
            "difficulty": "Easy"
        })
        self.assertEqual(res_card.status_code, 201)
        card_id = res_card.get_json()["data"][0]["id"]

        # Review card (Mark Known)
        res_rev = self.client.post(f"/api/flashcards/{card_id}/review", headers=headers, json={
            "is_known": True
        })
        self.assertEqual(res_rev.status_code, 200)
        self.assertTrue(res_rev.get_json()["data"]["is_known"])
        self.assertEqual(res_rev.get_json()["data"]["review_count"], 1)

        # Check Deck Mastery
        res_decks = self.client.get("/api/flashcards/decks", headers=headers)
        deck = res_decks.get_json()["data"][0]
        self.assertEqual(deck["mastery_pct"], 100)
        self.assertEqual(deck["known_cards"], 1)

    def test_ai_flashcard_generation_fallback(self):
        _, headers = self.register_and_login()

        # Test generation with sample text
        res = self.client.post("/api/flashcards/generate", headers=headers, json={
            "topic": "Photosynthesis",
            "text": "Photosynthesis is the process by which green plants convert light energy into chemical energy. Chlorophyll is a pigment that absorbs light.",
            "count": 2
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue(len(data["cards"]) > 0)
        self.assertIn("source", data)
        self.assertIn("source_label", data)
        # Should be heuristic when GEMINI_API_KEY is empty
        self.assertEqual(data["source"], "heuristic")
        self.assertIn("What is Photosynthesis?", data["cards"][0]["question"])

    def test_frontend_static_serving(self):
        # Test index.html serving at root
        res_root = self.client.get("/")
        self.assertEqual(res_root.status_code, 200)
        self.assertIn(b"AI Student Assistance", res_root.data)

        # Test static assets serving
        res_css = self.client.get("/style.css")
        self.assertEqual(res_css.status_code, 200)

        res_js = self.client.get("/app.js")
        self.assertEqual(res_js.status_code, 200)

        # Test 404 for nonexistent file
        res_404 = self.client.get("/nonexistent.file")
        self.assertEqual(res_404.status_code, 404)

    def test_all_eight_scenarios_lifecycle(self):
        # Scenario 1: Register a new user
        reg_res = self.client.post("/api/auth/register", json={
            "email": "johndoe@university.edu",
            "password": "MyStrongPassword123",
            "name": "John Doe"
        })
        self.assertEqual(reg_res.status_code, 201)
        reg_data = reg_res.get_json()["data"]
        self.assertIn("token", reg_data)
        self.assertEqual(reg_data["user"]["email"], "johndoe@university.edu")

        # Scenario 2: Log in using newly registered credentials
        login_res = self.client.post("/api/auth/login", json={
            "email": "johndoe@university.edu",
            "password": "MyStrongPassword123"
        })
        self.assertEqual(login_res.status_code, 200)

        # Scenario 3: Attempt login with incorrect password
        bad_pw_res = self.client.post("/api/auth/login", json={
            "email": "johndoe@university.edu",
            "password": "WrongPassword!"
        })
        self.assertEqual(bad_pw_res.status_code, 401)
        self.assertEqual(bad_pw_res.get_json()["error"], "Invalid email or password.")

        # Scenario 4: Attempt login with unregistered email
        unreg_res = self.client.post("/api/auth/login", json={
            "email": "ghost@university.edu",
            "password": "MyStrongPassword123"
        })
        self.assertEqual(unreg_res.status_code, 401)
        self.assertEqual(unreg_res.get_json()["error"], "Invalid email or password.")

        # Scenario 5: Verify JWT generation after successful login
        jwt_token = login_res.get_json()["data"]["token"]
        self.assertTrue(len(jwt_token) > 20)
        auth_headers = {"Authorization": f"Bearer {jwt_token}"}

        # Scenario 6: Access protected API endpoints using the generated token
        me_res = self.client.get("/api/auth/me", headers=auth_headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["data"]["user"]["name"], "John Doe")

        # Scenario 7: Verify dashboard data loading after login (all core endpoints called on dashboard load)
        tasks_res = self.client.get("/api/tasks", headers=auth_headers)
        cal_res = self.client.get("/api/calendar", headers=auth_headers)
        decks_res = self.client.get("/api/flashcards/decks", headers=auth_headers)
        cards_res = self.client.get("/api/flashcards", headers=auth_headers)
        analytics_res = self.client.get("/api/analytics", headers=auth_headers)

        self.assertEqual(tasks_res.status_code, 200)
        self.assertEqual(cal_res.status_code, 200)
        self.assertEqual(decks_res.status_code, 200)
        self.assertEqual(cards_res.status_code, 200)
        self.assertEqual(analytics_res.status_code, 200)

        # Scenario 8: Ensure tasks, calendar, Pomodoro sessions, and analytics continue working
        # Add task
        new_task = self.client.post("/api/tasks", headers=auth_headers, json={
            "title": "Study Calculus III",
            "priority": "high",
            "category": "Study",
            "due_date": "2026-11-20"
        })
        self.assertEqual(new_task.status_code, 201)

        # Add event
        new_event = self.client.post("/api/calendar", headers=auth_headers, json={
            "title": "Calculus Lecture",
            "date": "2026-11-20",
            "start_time": "10:00",
            "end_time": "11:30",
            "category": "Classes"
        })
        self.assertEqual(new_event.status_code, 201)

        # Add Pomodoro session
        new_session = self.client.post("/api/sessions", headers=auth_headers, json={
            "duration_minutes": 25,
            "session_type": "focus",
            "topic": "Calculus"
        })
        self.assertEqual(new_session.status_code, 201)

        # Verify analytics reflects the session
        post_analytics = self.client.get("/api/analytics", headers=auth_headers)
        self.assertEqual(post_analytics.status_code, 200)
        self.assertEqual(post_analytics.get_json()["data"]["overview"]["today_study_minutes"], 25)

if __name__ == "__main__":
    unittest.main()
