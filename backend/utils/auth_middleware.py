import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from ..config import Config
from ..models import db, User

def get_jwt_secret():
    if current_app and current_app.config.get("JWT_SECRET_KEY"):
        return current_app.config["JWT_SECRET_KEY"]
    return Config.JWT_SECRET_KEY

def generate_token(user_id: int) -> str:
    secret = get_jwt_secret()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=Config.JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_token(token: str) -> dict:
    secret = get_jwt_secret()
    return jwt.decode(token, secret, algorithms=["HS256"])

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
        elif "token" in request.args:
            token = request.args.get("token")

        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication token is missing. Please sign in."
            }), 401

        try:
            data = decode_token(token)
            sub_val = data.get("sub")
            if not sub_val:
                return jsonify({
                    "success": False,
                    "error": "Invalid token subject."
                }), 401

            user_id = int(sub_val)
            current_user = db.session.get(User, user_id)
            if not current_user:
                return jsonify({
                    "success": False,
                    "error": "User associated with this session no longer exists."
                }), 401
        except jwt.ExpiredSignatureError:
            return jsonify({
                "success": False,
                "error": "Session has expired. Please sign in again."
            }), 401
        except jwt.InvalidTokenError as e:
            return jsonify({
                "success": False,
                "error": f"Invalid authentication token: {str(e)}"
            }), 401
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Authentication failed: {str(e)}"
            }), 401

        return f(current_user, *args, **kwargs)

    return decorated
