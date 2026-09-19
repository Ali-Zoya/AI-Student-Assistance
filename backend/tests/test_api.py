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
        token, headers = self.register_and_login()
        
        # Test /api/auth/me
        res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["user"]["email"], "student@university.edu")

        # Test login
        res_login = self.client.post("/api/auth/login", json={
            "email": "student@university.edu",
            "password": "password123"
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("token", res_login.get_json()["data"])

        # Test invalid password
        res_bad = self.client.post("/api/auth/login", json={
            "email": "student@university.edu",
            "password": "wrongpassword"
        })
        self.assertEqual(res_bad.status_code, 401)

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

if __name__ == "__main__":
    unittest.main()
