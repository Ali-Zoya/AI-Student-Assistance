from flask import Blueprint, request
from ..models import db, StudySession
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response, error_response

sessions_bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")

@sessions_bp.route("", methods=["GET"])
@token_required
def get_sessions(current_user):
    limit = request.args.get("limit", 20, type=int)
    sessions = StudySession.query.filter_by(user_id=current_user.id)\
        .order_by(StudySession.completed_at.desc())\
        .limit(limit)\
        .all()
    return success_response([s.to_dict() for s in sessions])

@sessions_bp.route("", methods=["POST"])
@token_required
def create_session(current_user):
    data = request.get_json() or {}
    duration_minutes = int(data.get("duration_minutes") or data.get("minutes") or 25)
    session_type = data.get("session_type", "focus")
    topic = (data.get("topic") or "General Study").strip()

    session = StudySession(
        user_id=current_user.id,
        duration_minutes=duration_minutes,
        session_type=session_type,
        topic=topic
    )

    try:
        db.session.add(session)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to log study session.", 500, str(e))

    return success_response(session.to_dict(), "Study session logged successfully", 201)
