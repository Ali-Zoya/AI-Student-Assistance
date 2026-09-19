import requests
import sys

BASE = "http://127.0.0.1:5000"

def run_live_verification():
    print("==================================================")
    print("  AI Student Assistance - Live End-to-End Test")
    print("==================================================")

    # 1. Health check
    r_health = requests.get(f"{BASE}/api/health")
    assert r_health.status_code == 200, f"Health check failed: {r_health.status_code}"
    print(f"[OK] 1. Backend Health: {r_health.json()}")

    # 2. Frontend delivery check
    r_html = requests.get(f"{BASE}/")
    assert r_html.status_code == 200, f"Frontend HTML failed: {r_html.status_code}"
    assert "AI Student Assistance" in r_html.text
    print(f"[OK] 2. Frontend HTML Served ({len(r_html.text)} bytes)")

    # 3. User Registration
    user_email = f"student_{int(requests.get(f'{BASE}/api/health').elapsed.total_seconds()*1000)}@university.edu"
    reg_payload = {
        "name": "Sophia Martinez",
        "email": user_email,
        "password": "securepassword123"
    }
    r_reg = requests.post(f"{BASE}/api/auth/register", json=reg_payload)
    assert r_reg.status_code == 201, f"Registration failed: {r_reg.text}"
    token = r_reg.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] 3. Registered Student: {user_email} (JWT Token received)")

    # 4. Auth Me Check
    r_me = requests.get(f"{BASE}/api/auth/me", headers=headers)
    assert r_me.status_code == 200
    print(f"[OK] 4. Authenticated /api/auth/me: {r_me.json()['data']['user']['name']}")

    # 5. Create Kanban Task
    t_payload = {
        "title": "Build ResNet Classifier",
        "description": "Train on CIFAR-10 with data augmentation",
        "category": "Coding",
        "priority": "high",
        "due_date": "2026-09-20",
        "status": "todo"
    }
    r_task = requests.post(f"{BASE}/api/tasks", headers=headers, json=t_payload)
    assert r_task.status_code == 201
    task_id = r_task.json()["data"]["id"]
    print(f"[OK] 5. Created Task: #{task_id} '{r_task.json()['data']['title']}'")

    # 6. Move Task (Kanban Drag & Drop)
    r_move = requests.put(f"{BASE}/api/tasks/{task_id}", headers=headers, json={"status": "inprogress"})
    assert r_move.status_code == 200
    assert r_move.json()["data"]["status"] == "inprogress"
    print(f"[OK] 6. Moved Task status to 'inprogress'")

    # 7. Create Academic Calendar Event
    cal_payload = {
        "title": "Computer Vision Midterm Exam",
        "description": "Hall B, covers CNNs and object detection",
        "event_date": "2026-09-25",
        "start_time": "10:00",
        "end_time": "12:00",
        "category": "Exams"
    }
    r_cal = requests.post(f"{BASE}/api/calendar", headers=headers, json=cal_payload)
    assert r_cal.status_code == 201
    evt_id = r_cal.json()["data"]["id"]
    print(f"[OK] 7. Scheduled Academic Event: #{evt_id} '{r_cal.json()['data']['title']}' ({r_cal.json()['data']['category']})")

    # 8. Log Pomodoro Study Session
    pomo_payload = {
        "duration_minutes": 25,
        "session_type": "focus",
        "topic": "Convolutional Neural Networks"
    }
    r_pomo = requests.post(f"{BASE}/api/sessions", headers=headers, json=pomo_payload)
    assert r_pomo.status_code == 201
    print(f"[OK] 8. Logged Pomodoro Session: 25m Focus Block")

    # 9. Create Flashcard Deck
    deck_payload = {
        "title": "Computer Vision 101",
        "description": "Key concepts in image filtering and deep networks",
        "color": "#2563eb"
    }
    r_deck = requests.post(f"{BASE}/api/flashcards/decks", headers=headers, json=deck_payload)
    assert r_deck.status_code == 201
    deck_id = r_deck.json()["data"]["id"]
    print(f"[OK] 9. Created Flashcard Deck: #{deck_id} '{r_deck.json()['data']['title']}'")

    # 10. AI Flashcard Synthesizer
    ai_payload = {
        "topic": "Deep Learning",
        "text": "A convolutional neural network is a class of deep neural networks commonly applied to analyzing visual imagery. Backpropagation is the primary algorithm used to train neural networks by calculating gradients. Transfer learning refers to utilizing a pre-trained model on a new dataset.",
        "count": 3
    }
    r_ai = requests.post(f"{BASE}/api/flashcards/generate", headers=headers, json=ai_payload)
    assert r_ai.status_code == 200
    gen_data = r_ai.json()["data"]
    print(f"[OK] 10. AI Synthesizer: Generated {len(gen_data['cards'])} cards via {gen_data['source_label']}")

    # 11. Save Synthesized Cards to Deck
    cards_to_save = gen_data["cards"]
    for c in cards_to_save:
        c["deck_id"] = deck_id
    r_save = requests.post(f"{BASE}/api/flashcards", headers=headers, json={"cards": cards_to_save})
    assert r_save.status_code == 201
    saved_cards = r_save.json()["data"]
    card_id = saved_cards[0]["id"]
    print(f"[OK] 11. Saved {len(saved_cards)} cards into Deck #{deck_id}")

    # 12. Active Recall Review (Study Mode)
    r_rev = requests.post(f"{BASE}/api/flashcards/{card_id}/review", headers=headers, json={"is_known": True})
    assert r_rev.status_code == 200
    assert r_rev.json()["data"]["is_known"] == True
    print(f"[OK] 12. Study Mode: Marked Card #{card_id} as Mastered")

    # 13. Query Productivity Analytics
    r_analytics = requests.get(f"{BASE}/api/analytics", headers=headers)
    assert r_analytics.status_code == 200
    overview = r_analytics.json()["data"]["overview"]
    print(f"[OK] 13. Productivity Analytics Retrieved:")
    print(f"     - Today's Focus Minutes: {overview['today_study_minutes']}m")
    print(f"     - Sessions Completed: {overview['sessions_today']}")
    print(f"     - Total Tasks: {overview['total_tasks']}")
    print(f"     - Flashcards Total: {overview['total_flashcards']}")
    print(f"     - Flashcard Mastery: {overview['flashcard_mastery']}%")
    print(f"     - Current Streak: {overview['current_streak']} Day(s)")

    print("==================================================")
    print("  ALL 13 LIVE INTEGRATION CHECKS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_live_verification()
