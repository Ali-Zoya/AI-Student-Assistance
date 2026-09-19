from datetime import datetime, timezone
from . import db

def utc_now():
    return datetime.now(timezone.utc)

class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    priority = db.Column(db.String(20), default="medium")  # 'high', 'medium', 'low'
    category = db.Column(db.String(50), default="Study")   # 'Study', 'Coding', 'Design', 'General', etc.
    due_date = db.Column(db.String(10), nullable=True)     # 'YYYY-MM-DD'
    status = db.Column(db.String(20), default="todo")      # 'todo', 'inprogress', 'completed'
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "text": self.title,  # backward compatibility with existing frontend
            "description": self.description or "",
            "priority": self.priority or "medium",
            "category": self.category or "General",
            "dueDate": self.due_date,  # backward compatibility
            "due_date": self.due_date,
            "status": self.status or "todo",
            "completed": self.status == "completed",
            "order_index": self.order_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
