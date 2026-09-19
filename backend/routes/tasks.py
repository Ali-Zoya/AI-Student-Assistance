from flask import Blueprint, request, jsonify
from ..models import db, Task
from ..utils.auth_middleware import token_required
from ..utils.helpers import success_response, error_response

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

@tasks_bp.route("", methods=["GET"])
@token_required
def get_tasks(current_user):
    query = Task.query.filter_by(user_id=current_user.id)

    # Filtering parameters
    status = request.args.get("status")
    category = request.args.get("category")
    priority = request.args.get("priority")
    search = request.args.get("search")
    sort = request.args.get("sort", "created_at_desc")

    if status:
        query = query.filter(Task.status == status)
    if category and category != "All":
        query = query.filter(Task.category == category)
    if priority and priority != "All":
        query = query.filter(Task.priority == priority)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter((Task.title.ilike(search_term)) | (Task.description.ilike(search_term)))

    # Sorting
    if sort == "due_date_asc":
        query = query.order_by(Task.due_date.asc().nullslast())
    elif sort == "due_date_desc":
        query = query.order_by(Task.due_date.desc().nullslast())
    elif sort == "priority":
        # high, medium, low
        query = query.order_by(Task.priority.asc())
    elif sort == "title":
        query = query.order_by(Task.title.asc())
    else:
        query = query.order_by(Task.order_index.asc(), Task.created_at.desc())

    tasks = query.all()
    return success_response([t.to_dict() for t in tasks])

@tasks_bp.route("", methods=["POST"])
@token_required
def create_task(current_user):
    data = request.get_json() or {}
    title = (data.get("title") or data.get("text") or "").strip()

    if not title:
        return error_response("Task title is required.", 400)

    priority = data.get("priority", "medium").lower()
    if priority not in ["high", "medium", "low"]:
        priority = "medium"

    category = (data.get("category") or "Study").strip()
    status = data.get("status", "todo").lower()
    if status not in ["todo", "inprogress", "completed"]:
        status = "todo"

    due_date = data.get("due_date") or data.get("dueDate")
    description = (data.get("description") or "").strip()

    task = Task(
        user_id=current_user.id,
        title=title,
        description=description,
        priority=priority,
        category=category,
        due_date=due_date,
        status=status
    )

    try:
        db.session.add(task)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to create task.", 500, str(e))

    return success_response(task.to_dict(), "Task created successfully", 201)

@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@token_required
def update_task(current_user, task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return error_response("Task not found.", 404)

    data = request.get_json() or {}

    if "title" in data or "text" in data:
        new_title = (data.get("title") or data.get("text") or "").strip()
        if new_title:
            task.title = new_title

    if "description" in data:
        task.description = (data.get("description") or "").strip()

    if "priority" in data:
        p = data.get("priority", "medium").lower()
        if p in ["high", "medium", "low"]:
            task.priority = p

    if "category" in data:
        task.category = (data.get("category") or "Study").strip()

    if "status" in data:
        s = data.get("status", "todo").lower()
        if s in ["todo", "inprogress", "completed"]:
            task.status = s

    if "due_date" in data or "dueDate" in data:
        task.due_date = data.get("due_date") or data.get("dueDate")

    if "order_index" in data:
        task.order_index = int(data.get("order_index", 0))

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to update task.", 500, str(e))

    return success_response(task.to_dict(), "Task updated successfully")

@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@token_required
def delete_task(current_user, task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        return error_response("Task not found.", 404)

    try:
        db.session.delete(task)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to delete task.", 500, str(e))

    return success_response({"id": task_id}, "Task deleted successfully")

@tasks_bp.route("", methods=["PUT"])
@token_required
def batch_update_tasks(current_user):
    """
    Supports updating a batch of tasks (e.g., reordering or status sync from Kanban)
    """
    data = request.get_json() or []
    if isinstance(data, dict) and "tasks" in data:
        data = data["tasks"]

    if not isinstance(data, list):
        return error_response("Expected an array of task objects.", 400)

    try:
        for item in data:
            t_id = item.get("id")
            if not t_id:
                continue
            task = Task.query.filter_by(id=t_id, user_id=current_user.id).first()
            if task:
                if "status" in item and item["status"] in ["todo", "inprogress", "completed"]:
                    task.status = item["status"]
                if "order_index" in item:
                    task.order_index = int(item["order_index"])
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to batch update tasks.", 500, str(e))

    user_tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.order_index.asc()).all()
    return success_response([t.to_dict() for t in user_tasks], "Tasks synchronized successfully")
