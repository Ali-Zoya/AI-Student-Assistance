import os
import sys
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy.exc import OperationalError

# Ensure parent directory is in python path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import Config
from backend.models import db
from backend.routes.auth import auth_bp
from backend.routes.tasks import tasks_bp
from backend.routes.calendar import calendar_bp
from backend.routes.sessions import sessions_bp
from backend.routes.flashcards import flashcards_bp
from backend.routes.ai import ai_bp
from backend.routes.analytics import analytics_bp

def create_app(config_class=Config):
    app = Flask(__name__, static_folder=str(PROJECT_ROOT))
    app.config.from_object(config_class)

    # Enable CORS for all API endpoints
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize SQLAlchemy database
    db.init_app(app)

    # Register API blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(flashcards_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(analytics_bp)

    # Health check route
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_type = "postgresql" if "postgresql" in app.config["SQLALCHEMY_DATABASE_URI"] else "sqlite"
        return jsonify({
            "status": "healthy",
            "database": db_type,
            "version": "2.0.0"
        })

    # Serve static frontend files for seamless standalone execution
    @app.route("/", methods=["GET"])
    def index():
        return send_from_directory(str(PROJECT_ROOT), "index.html")

    @app.route("/<path:filename>", methods=["GET"])
    def static_files(filename):
        if (PROJECT_ROOT / filename).exists():
            return send_from_directory(str(PROJECT_ROOT), filename)
        return jsonify({"error": "File not found"}), 404

    # Ensure tables exist
    with app.app_context():
        try:
            db.create_all()
            print(f"[Database] Tables initialized successfully using {app.config['SQLALCHEMY_DATABASE_URI']}")
        except OperationalError as e:
            # If PostgreSQL was configured but unreachable, gracefully fall back to SQLite
            if "postgresql" in app.config["SQLALCHEMY_DATABASE_URI"]:
                print(f"[Database Warning] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
                sqlite_path = BASE_DIR / "student_assistance.db"
                app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"
                db.engine.dispose()
                db.init_app(app)
                db.create_all()
                print(f"[Database] Initialized fallback SQLite tables at {sqlite_path}")
            else:
                raise e

    return app

app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print(f"[Server] AI Student Assistance Backend running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
