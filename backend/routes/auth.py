from flask import Blueprint, request, jsonify
from ..models import db, User
from ..utils.auth_middleware import generate_token, token_required
from ..utils.helpers import is_valid_email, success_response, error_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or "").strip()

    if not is_valid_email(email):
        return error_response("Please provide a valid email address.", 400)
    
    if len(password) < 6:
        return error_response("Password must be at least 6 characters long.", 400)

    if not name:
        # Default name to prefix of email if omitted
        name = email.split("@")[0].capitalize()

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return error_response("An account with this email already exists.", 409)

    user = User(email=email, name=name)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to create account.", 500, str(e))

    token = generate_token(user.id)
    return success_response({
        "token": token,
        "user": user.to_dict()
    }, "Registration successful", 201)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return error_response("Email and password are required.", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error_response("Invalid email or password.", 401)

    token = generate_token(user.id)
    return success_response({
        "token": token,
        "user": user.to_dict()
    }, "Login successful")

@auth_bp.route("/me", methods=["GET"])
@token_required
def me(current_user):
    return success_response({
        "user": current_user.to_dict()
    })

@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout(current_user):
    return success_response(None, "Logged out successfully")
