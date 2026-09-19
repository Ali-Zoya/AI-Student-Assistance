from datetime import datetime, timezone
from . import db

def utc_now():
    return datetime.now(timezone.utc)

class CalendarEvent(db.Model):
    __tablename__ = "calendar_events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    event_date = db.Column(db.String(10), nullable=False, index=True)  # 'YYYY-MM-DD'
    start_time = db.Column(db.String(5), default="09:00")              # 'HH:MM'
    end_time = db.Column(db.String(5), default="10:00")                # 'HH:MM'
    category = db.Column(db.String(50), default="Classes")             # 'Classes', 'Exams', 'Assignments', 'Deadlines', 'Study', 'Other'
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self) -> dict:
        # String representation compatible with legacy format
        raw_text = f"{self.event_date}: {self.title}"
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description or "",
            "event_date": self.event_date,
            "date": self.event_date,
            "start_time": self.start_time or "09:00",
            "end_time": self.end_time or "10:00",
            "category": self.category or "Classes",
            "completed": bool(self.completed),
            "text": raw_text,  # backward compatibility with existing frontend
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
