import re
from datetime import datetime
from flask import jsonify

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def is_valid_email(email: str) -> bool:
    if not email or len(email) > 255:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def is_valid_date(date_str: str) -> bool:
    if not date_str:
        return False
    try:
        datetime.strptime(date_str.strip(), "%Y-%m-%d")
        return True
    except ValueError:
        return False

def success_response(data=None, message="Success", status_code=200):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code

def error_response(error_message="An error occurred", status_code=400, details=None):
    payload = {"success": False, "error": error_message}
    if details:
        payload["details"] = details
    return jsonify(payload), status_code
