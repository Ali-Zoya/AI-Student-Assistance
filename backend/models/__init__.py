from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User
from .task import Task
from .calendar_event import CalendarEvent
from .study_session import StudySession
from .flashcard import FlashcardDeck, Flashcard

__all__ = [
    "db",
    "User",
    "Task",
    "CalendarEvent",
    "StudySession",
    "FlashcardDeck",
    "Flashcard"
]
