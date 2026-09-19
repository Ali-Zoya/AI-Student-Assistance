from flask import Blueprint
from ..services.analytics_service import get_user_analytics
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

@analytics_bp.route("", methods=["GET"])
@token_required
def get_analytics(current_user):
    data = get_user_analytics(current_user.id)
    return success_response(data)
