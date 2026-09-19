import re
from flask import Blueprint, request
from ..models import db, CalendarEvent
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response, error_response, is_valid_date

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")

@calendar_bp.route("", methods=["GET"])
@token_required
def get_calendar_events(current_user):
    query = CalendarEvent.query.filter_by(user_id=current_user.id)

    month = request.args.get("month")  # e.g., '2026-09'
    date = request.args.get("date")    # e.g., '2026-09-19'
    category = request.args.get("category")

    if month:
        query = query.filter(CalendarEvent.event_date.startswith(month))
    if date:
        query = query.filter(CalendarEvent.event_date == date)
    if category and category != "All":
        query = query.filter(CalendarEvent.category == category)

    events = query.order_by(CalendarEvent.event_date.asc(), CalendarEvent.start_time.asc()).all()
    return success_response([e.to_dict() for e in events])

@calendar_bp.route("", methods=["POST"])
@token_required
def create_calendar_event(current_user):
    data = request.get_json() or {}
    
    # Support both structured object and legacy string "YYYY-MM-DD: Event description"
    raw_text = (data.get("text") or "").strip()
    title = (data.get("title") or "").strip()
    event_date = data.get("event_date") or data.get("date")
    start_time = data.get("start_time", "09:00")
    end_time = data.get("end_time", "10:00")
    category = (data.get("category") or "Classes").strip()
    description = (data.get("description") or "").strip()

    if not title and raw_text:
        match = re.match(r"^(\d{4}-\d{2}-\d{2}):\s*(.*)$", raw_text)
        if match:
            event_date = match.group(1)
            title = match.group(2)
        else:
            title = raw_text

    if not title:
        return error_response("Event title is required.", 400)

    if not event_date or not is_valid_date(event_date):
        return error_response("A valid event date (YYYY-MM-DD) is required.", 400)

    event = CalendarEvent(
        user_id=current_user.id,
        title=title,
        description=description,
        event_date=event_date,
        start_time=start_time,
        end_time=end_time,
        category=category,
        completed=False
    )

    try:
        db.session.add(event)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to create calendar event.", 500, str(e))

    return success_response(event.to_dict(), "Calendar event created successfully", 201)

@calendar_bp.route("/<int:event_id>", methods=["PUT"])
@token_required
def update_calendar_event(current_user, event_id):
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    if not event:
        return error_response("Calendar event not found.", 404)

    data = request.get_json() or {}

    if "title" in data:
        event.title = data["title"].strip()
    if "description" in data:
        event.description = data["description"].strip()
    if "event_date" in data or "date" in data:
        d = data.get("event_date") or data.get("date")
        if is_valid_date(d):
            event.event_date = d
    if "start_time" in data:
        event.start_time = data["start_time"]
    if "end_time" in data:
        event.end_time = data["end_time"]
    if "category" in data:
        event.category = data["category"]
    if "completed" in data:
        event.completed = bool(data["completed"])

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to update calendar event.", 500, str(e))

    return success_response(event.to_dict(), "Calendar event updated successfully")

@calendar_bp.route("/<int:event_id>/toggle", methods=["POST"])
@token_required
def toggle_calendar_event(current_user, event_id):
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    if not event:
        return error_response("Calendar event not found.", 404)

    event.completed = not event.completed

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to toggle calendar event.", 500, str(e))

    return success_response(event.to_dict(), "Event status toggled successfully")

@calendar_bp.route("/<int:event_id>", methods=["DELETE"])
@token_required
def delete_calendar_event(current_user, event_id):
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    if not event:
        return error_response("Calendar event not found.", 404)

    try:
        db.session.delete(event)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to delete calendar event.", 500, str(e))

    return success_response({"id": event_id}, "Calendar event deleted successfully")
