import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-student-assistant-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-student-assistant-2026")
    JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", "7"))
    
    # Database configuration
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        # Default fallback to SQLite database file in backend directory
        db_path = BASE_DIR / "student_assistance.db"
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # External AI keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    
    # Server port
    PORT = int(os.getenv("PORT", "5000"))
