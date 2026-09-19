from datetime import datetime, timezone
from . import db

def utc_now():
    return datetime.now(timezone.utc)

class StudySession(db.Model):
    __tablename__ = "study_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=25)
    session_type = db.Column(db.String(30), default="focus")  # 'focus', 'short_break', 'long_break'
    topic = db.Column(db.String(100), default="General Study")
    completed_at = db.Column(db.DateTime, default=utc_now, index=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "duration_minutes": self.duration_minutes,
            "session_type": self.session_type,
            "topic": self.topic,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
