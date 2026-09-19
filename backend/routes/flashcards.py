from flask import Blueprint, request
from ..models import db, FlashcardDeck, Flashcard
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response, error_response

flashcards_bp = Blueprint("flashcards", __name__, url_prefix="/api/flashcards")

# ==================== DECKS ====================

@flashcards_bp.route("/decks", methods=["GET"])
@token_required
def get_decks(current_user):
    decks = FlashcardDeck.query.filter_by(user_id=current_user.id).order_by(FlashcardDeck.created_at.asc()).all()
    return success_response([d.to_dict() for d in decks])

@flashcards_bp.route("/decks", methods=["POST"])
@token_required
def create_deck(current_user):
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return error_response("Deck title is required.", 400)

    description = (data.get("description") or "").strip()
    color = data.get("color", "#2563eb")

    deck = FlashcardDeck(
        user_id=current_user.id,
        title=title,
        description=description,
        color=color
    )

    try:
        db.session.add(deck)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to create deck.", 500, str(e))

    return success_response(deck.to_dict(), "Deck created successfully", 201)

@flashcards_bp.route("/decks/<int:deck_id>", methods=["PUT"])
@token_required
def update_deck(current_user, deck_id):
    deck = FlashcardDeck.query.filter_by(id=deck_id, user_id=current_user.id).first()
    if not deck:
        return error_response("Deck not found.", 404)

    data = request.get_json() or {}
    if "title" in data and data["title"].strip():
        deck.title = data["title"].strip()
    if "description" in data:
        deck.description = data["description"].strip()
    if "color" in data:
        deck.color = data["color"]

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to update deck.", 500, str(e))

    return success_response(deck.to_dict(), "Deck updated successfully")

@flashcards_bp.route("/decks/<int:deck_id>", methods=["DELETE"])
@token_required
def delete_deck(current_user, deck_id):
    deck = FlashcardDeck.query.filter_by(id=deck_id, user_id=current_user.id).first()
    if not deck:
        return error_response("Deck not found.", 404)

    try:
        db.session.delete(deck)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to delete deck.", 500, str(e))

    return success_response({"id": deck_id}, "Deck deleted successfully")


# ==================== CARDS ====================

@flashcards_bp.route("", methods=["GET"])
@token_required
def get_flashcards(current_user):
    query = Flashcard.query.filter_by(user_id=current_user.id)

    deck_id = request.args.get("deck_id")
    topic = request.args.get("topic") or request.args.get("category")
    difficulty = request.args.get("difficulty")
    search = request.args.get("search")
    is_known = request.args.get("is_known")

    if deck_id:
        if deck_id == "none":
            query = query.filter(Flashcard.deck_id == None)
        else:
            try:
                query = query.filter(Flashcard.deck_id == int(deck_id))
            except ValueError:
                pass

    if topic and topic != "All":
        query = query.filter(Flashcard.topic == topic)

    if difficulty and difficulty != "All":
        query = query.filter(Flashcard.difficulty == difficulty)

    if is_known is not None:
        query = query.filter(Flashcard.is_known == (is_known.lower() == "true"))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter((Flashcard.question.ilike(term)) | (Flashcard.answer.ilike(term)))

    cards = query.order_by(Flashcard.created_at.desc()).all()
    return success_response([c.to_dict() for c in cards])

@flashcards_bp.route("", methods=["POST"])
@token_required
def create_flashcards(current_user):
    """
    Accepts either a single flashcard object or a list/dict with "cards" for bulk addition.
    """
    payload = request.get_json() or {}

    cards_to_add = []
    if isinstance(payload, list):
        cards_to_add = payload
    elif "cards" in payload and isinstance(payload["cards"], list):
        cards_to_add = payload["cards"]
    else:
        cards_to_add = [payload]

    created_cards = []
    try:
        for item in cards_to_add:
            q = (item.get("question") or "").strip()
            a = (item.get("answer") or "").strip()
            if not q or not a:
                continue

            deck_id = item.get("deck_id")
            if deck_id:
                try:
                    deck_id = int(deck_id)
                except ValueError:
                    deck_id = None

            topic = (item.get("topic") or item.get("category") or "General").strip()
            difficulty = (item.get("difficulty") or "Medium").capitalize()
            if difficulty not in ["Easy", "Medium", "Hard"]:
                difficulty = "Medium"

            source = item.get("source", "manual")

            card = Flashcard(
                user_id=current_user.id,
                deck_id=deck_id,
                question=q,
                answer=a,
                topic=topic,
                difficulty=difficulty,
                source=source,
                is_known=False,
                review_count=0
            )
            db.session.add(card)
            created_cards.append(card)

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to save flashcard(s).", 500, str(e))

    return success_response([c.to_dict() for c in created_cards], f"Saved {len(created_cards)} flashcard(s)", 201)

@flashcards_bp.route("/<int:card_id>", methods=["PUT"])
@token_required
def update_flashcard(current_user, card_id):
    card = Flashcard.query.filter_by(id=card_id, user_id=current_user.id).first()
    if not card:
        return error_response("Flashcard not found.", 404)

    data = request.get_json() or {}
    if "question" in data and data["question"].strip():
        card.question = data["question"].strip()
    if "answer" in data and data["answer"].strip():
        card.answer = data["answer"].strip()
    if "topic" in data or "category" in data:
        card.topic = (data.get("topic") or data.get("category") or "General").strip()
    if "difficulty" in data:
        diff = data["difficulty"].capitalize()
        if diff in ["Easy", "Medium", "Hard"]:
            card.difficulty = diff
    if "deck_id" in data:
        d_id = data["deck_id"]
        card.deck_id = int(d_id) if d_id else None
    if "is_known" in data:
        card.is_known = bool(data["is_known"])

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to update flashcard.", 500, str(e))

    return success_response(card.to_dict(), "Flashcard updated successfully")

@flashcards_bp.route("/<int:card_id>/review", methods=["POST"])
@token_required
def review_flashcard(current_user, card_id):
    card = Flashcard.query.filter_by(id=card_id, user_id=current_user.id).first()
    if not card:
        return error_response("Flashcard not found.", 404)

    data = request.get_json() or {}
    is_known = data.get("is_known", False)
    
    card.is_known = bool(is_known)
    card.review_count = (card.review_count or 0) + 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to record card review.", 500, str(e))

    return success_response(card.to_dict(), "Review recorded")

@flashcards_bp.route("/<int:card_id>", methods=["DELETE"])
@token_required
def delete_flashcard(current_user, card_id):
    card = Flashcard.query.filter_by(id=card_id, user_id=current_user.id).first()
    if not card:
        return error_response("Flashcard not found.", 404)

    try:
        db.session.delete(card)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to delete flashcard.", 500, str(e))

    return success_response({"id": card_id}, "Flashcard deleted successfully")
