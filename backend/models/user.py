from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from . import db

def utc_now():
    return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relationships
    tasks = db.relationship("Task", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    calendar_events = db.relationship("CalendarEvent", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    study_sessions = db.relationship("StudySession", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    flashcard_decks = db.relationship("FlashcardDeck", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    flashcards = db.relationship("Flashcard", backref="user", cascade="all, delete-orphan", lazy="dynamic")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
