from flask import Blueprint, request
from ..services.ai_service import generate_study_flashcards
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response, error_response

ai_bp = Blueprint("ai", __name__, url_prefix="/api/flashcards")

@ai_bp.route("/generate", methods=["POST"])
@token_required
def generate_cards(current_user):
    data = request.get_json() or {}
    topic = (data.get("topic") or "General Study").strip()
    study_text = (data.get("text") or data.get("material") or data.get("notes") or "").strip()
    count = int(data.get("count", 5))

    if not study_text:
        return error_response("Please provide study notes, lecture transcript, or text material to synthesize.", 400)

    result = generate_study_flashcards(topic, study_text, count)
    if not result.get("success"):
        return error_response(result.get("error", "Generation failed"), 400)

    return success_response({
        "topic": topic,
        "source": result["source"],
        "source_label": result["source_label"],
        "cards": result["cards"]
    }, f"Synthesized {len(result['cards'])} flashcards successfully")
