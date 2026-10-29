import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure parent directory is in path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.models import db
from backend.models.user import User
from backend.models.task import Task
from backend.models.calendar_event import CalendarEvent
from backend.models.study_session import StudySession
from backend.models.flashcard import FlashcardDeck, Flashcard

def seed():
    app = create_app()
    with app.app_context():
        print("[Seed] Checking existing records...")
        existing_user = User.query.filter_by(email="demo@student.edu").first()
        if existing_user:
            print("[Seed] Demo user already exists. Cleaning up previous demo data...")
            db.session.delete(existing_user)
            db.session.commit()

        # 1. Create Demo User
        user = User(
            name="Alex Rivera",
            email="demo@student.edu"
        )
        user.set_password("student123")
        db.session.add(user)
        db.session.flush()
        print(f"[Seed] Created demo user: {user.email} (Password: student123)")

        today = datetime.now(timezone.utc)

        # 2. Add Sample Tasks
        tasks = [
            Task(
                user_id=user.id,
                title="Prepare Machine Learning Presentation",
                description="Finalize slides on CNN architectures and attention mechanisms.",
                priority="high",
                category="Study",
                due_date=(today + timedelta(days=2)).strftime("%Y-%m-%d"),
                status="todo",
                order_index=0
            ),
            Task(
                user_id=user.id,
                title="Implement Auth Middleware & Unit Tests",
                description="Write JWT verification tests and mock token generators.",
                priority="medium",
                category="Coding",
                due_date=(today + timedelta(days=4)).strftime("%Y-%m-%d"),
                status="inprogress",
                order_index=1
            ),
            Task(
                user_id=user.id,
                title="Submit Linear Algebra Assignment 3",
                description="Problems 14-22 on Eigenvalues and Diagonalization.",
                priority="high",
                category="Assignment",
                due_date=(today - timedelta(days=1)).strftime("%Y-%m-%d"),
                status="completed",
                order_index=2
            ),
            Task(
                user_id=user.id,
                title="Read Chapter 4: Database Normalization",
                description="Focus on BCNF and multi-valued dependencies.",
                priority="low",
                category="Reading",
                due_date=(today + timedelta(days=7)).strftime("%Y-%m-%d"),
                status="todo",
                order_index=3
            ),
        ]
        db.session.add_all(tasks)
        print(f"[Seed] Added {len(tasks)} sample tasks.")

        # 3. Add Sample Calendar Events
        events = [
            CalendarEvent(
                user_id=user.id,
                title="CS401: Deep Learning Lecture",
                description="Topic: Transformers and Self-Attention",
                event_date=today.strftime("%Y-%m-%d"),
                start_time="10:00",
                end_time="11:30",
                category="Classes"
            ),
            CalendarEvent(
                user_id=user.id,
                title="Midterm Exam: Operating Systems",
                description="Room 304, covers processes, threads, and memory paging.",
                event_date=(today + timedelta(days=3)).strftime("%Y-%m-%d"),
                start_time="14:00",
                end_time="16:00",
                category="Exams"
            ),
            CalendarEvent(
                user_id=user.id,
                title="Project Sprint Review",
                description="Demo backend REST APIs to the project team.",
                event_date=(today + timedelta(days=5)).strftime("%Y-%m-%d"),
                start_time="16:00",
                end_time="17:00",
                category="Deadlines"
            )
        ]
        db.session.add_all(events)
        print(f"[Seed] Added {len(events)} calendar events.")

        # 4. Add Study Sessions (Pomodoro)
        sessions = [
            StudySession(
                user_id=user.id,
                duration_minutes=25,
                session_type="focus",
                topic="Machine Learning Slides",
                completed_at=today - timedelta(hours=3)
            ),
            StudySession(
                user_id=user.id,
                duration_minutes=25,
                session_type="focus",
                topic="Linear Algebra Review",
                completed_at=today - timedelta(hours=1)
            ),
            StudySession(
                user_id=user.id,
                duration_minutes=5,
                session_type="short_break",
                topic="Break",
                completed_at=today - timedelta(minutes=30)
            )
        ]
        db.session.add_all(sessions)
        print(f"[Seed] Added {len(sessions)} study sessions.")

        # 5. Add Flashcard Deck and Cards
        deck = FlashcardDeck(
            user_id=user.id,
            title="Computer Networks & Protocols",
            description="Core concepts of TCP/IP, OSI Model, and HTTP standards.",
            color="#3b82f6"
        )
        db.session.add(deck)
        db.session.flush()

        cards = [
            Flashcard(
                user_id=user.id,
                deck_id=deck.id,
                question="What is the key difference between TCP and UDP?",
                answer="TCP is connection-oriented and guarantees reliable packet delivery, while UDP is connectionless and prioritizes low latency without delivery guarantees.",
                topic="Networking",
                difficulty="Medium",
                is_known=True,
                source="manual"
            ),
            Flashcard(
                user_id=user.id,
                deck_id=deck.id,
                question="What does the HTTP 401 status code represent?",
                answer="Unauthorized: The client request lacks valid authentication credentials.",
                topic="Web Protocols",
                difficulty="Easy",
                is_known=True,
                source="manual"
            ),
            Flashcard(
                user_id=user.id,
                deck_id=deck.id,
                question="How does DNS resolve a domain name into an IP address?",
                answer="The client queries a recursive resolver, which queries Root, TLD (.com), and authoritative name servers in sequence to find the corresponding IP.",
                topic="DNS",
                difficulty="Hard",
                is_known=False,
                source="manual"
            )
        ]
        db.session.add_all(cards)
        print(f"[Seed] Added flashcard deck with {len(cards)} flashcards.")

        db.session.commit()
        print("\n[Success] Database seeded successfully!")
        print("You can now refresh SQLite Viewer in VS Code to see all the populated data.")

if __name__ == "__main__":
    seed()
