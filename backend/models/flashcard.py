from datetime import datetime, timezone
from . import db

def utc_now():
    return datetime.now(timezone.utc)

class FlashcardDeck(db.Model):
    __tablename__ = "flashcard_decks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), default="")
    color = db.Column(db.String(30), default="#2563eb")
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relationships
    cards = db.relationship("Flashcard", backref="deck", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self) -> dict:
        total_cards = self.cards.count()
        known_cards = self.cards.filter_by(is_known=True).count()
        mastery_pct = round((known_cards / total_cards * 100)) if total_cards > 0 else 0
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description or "",
            "color": self.color or "#2563eb",
            "total_cards": total_cards,
            "known_cards": known_cards,
            "mastery_pct": mastery_pct,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Flashcard(db.Model):
    __tablename__ = "flashcards"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    deck_id = db.Column(db.Integer, db.ForeignKey("flashcard_decks.id", ondelete="SET NULL"), nullable=True, index=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(100), default="General")
    difficulty = db.Column(db.String(20), default="Medium")  # 'Easy', 'Medium', 'Hard'
    is_known = db.Column(db.Boolean, default=False)
    review_count = db.Column(db.Integer, default=0)
    source = db.Column(db.String(50), default="manual")      # 'manual', 'ai', 'heuristic'
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "deck_id": self.deck_id,
            "question": self.question,
            "answer": self.answer,
            "topic": self.topic or "General",
            "category": self.topic or "General",  # backward compatibility
            "difficulty": self.difficulty or "Medium",
            "is_known": bool(self.is_known),
            "review_count": self.review_count or 0,
            "source": self.source or "manual",
            "date": self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
