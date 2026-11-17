import os
import sys
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError

# ---------------------------------------------------------------------------
# Path bootstrap — ensure the project root is importable as a package
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent          # .../backend
PROJECT_ROOT = BASE_DIR.parent                       # .../AI Student Assistance
FRONTEND_DIR = PROJECT_ROOT / "frontend"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Application imports (must come after sys.path is patched)
# ---------------------------------------------------------------------------
from backend.config import Config
from backend.models import db, User
from backend.routes.auth import auth_bp
from backend.routes.tasks import tasks_bp
from backend.routes.calendar import calendar_bp
from backend.routes.sessions import sessions_bp
from backend.routes.flashcards import flashcards_bp
from backend.routes.ai import ai_bp
from backend.routes.analytics import analytics_bp

# ---------------------------------------------------------------------------
# SQLite connection listener — runs for EVERY new connection
# Sets WAL mode, normal sync, and foreign-key enforcement
# ---------------------------------------------------------------------------
@event.listens_for(Engine, "connect")
def configure_sqlite_pragmas(dbapi_connection, connection_record):
    if hasattr(dbapi_connection, "cursor"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
def create_app(config_class=Config):
    app = Flask(__name__, static_folder=str(FRONTEND_DIR))
    app.config.from_object(config_class)

    # SQLite concurrency options — must be set before db.init_app()
    db_uri = str(app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    if "sqlite" in db_uri:
        app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", {
            "connect_args": {
                "check_same_thread": False,
                "timeout": 30,
            }
        })

    # CORS — allow all origins for /api/* routes
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialise SQLAlchemy with this app
    db.init_app(app)

    # Register API blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(flashcards_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(analytics_bp)

    # -----------------------------------------------------------------------
    # Routes
    # -----------------------------------------------------------------------
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_type = "postgresql" if "postgresql" in app.config["SQLALCHEMY_DATABASE_URI"] else "sqlite"
        return jsonify({
            "status": "healthy",
            "database": db_type,
            "version": "2.0.0",
        })

    @app.route("/", methods=["GET"])
    def index():
        return send_from_directory(str(FRONTEND_DIR), "index.html")

    @app.route("/<path:filename>", methods=["GET"])
    def static_files(filename):
        if (FRONTEND_DIR / filename).is_file():
            return send_from_directory(str(FRONTEND_DIR), filename)
        if filename.startswith("frontend/"):
            rel_path = filename[len("frontend/"):]
            if (FRONTEND_DIR / rel_path).is_file():
                return send_from_directory(str(FRONTEND_DIR), rel_path)
        return jsonify({"error": "File not found"}), 404

    # -----------------------------------------------------------------------
    # Database initialisation
    # -----------------------------------------------------------------------
    with app.app_context():
        try:
            db.create_all()
            print(f"[Database] Tables initialised using {app.config['SQLALCHEMY_DATABASE_URI']}")

            # Demo account seeding — DISABLED by default.
            # Set SEED_DEMO_ACCOUNT=true in the environment to enable.
            seed_demo = os.getenv("SEED_DEMO_ACCOUNT", "").strip().lower() == "true"
            if seed_demo and not app.config.get("TESTING") and User.query.count() == 0:
                demo_user = User(name="Alex Rivera", email="demo@student.edu")
                demo_user.set_password("student123")
                db.session.add(demo_user)
                db.session.commit()
                print("[Database] Demo account created (demo@student.edu / student123).")

        except OperationalError as e:
            # Graceful fallback: if PostgreSQL was configured but is unreachable,
            # switch to a local SQLite file so the app can still start.
            if "postgresql" in app.config["SQLALCHEMY_DATABASE_URI"]:
                print(f"[Database Warning] PostgreSQL unreachable ({e}). "
                      "Falling back to local SQLite.")
                sqlite_path = BASE_DIR / "student_assistance.db"
                app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"
                db.engine.dispose()
                db.init_app(app)
                db.create_all()
                print(f"[Database] Fallback SQLite tables created at {sqlite_path}")
            else:
                raise

    return app


# ---------------------------------------------------------------------------
# Module-level app instance — used by gunicorn (`gunicorn app:app`)
# ---------------------------------------------------------------------------
app = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print(f"[Server] AI Student Assistance running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
