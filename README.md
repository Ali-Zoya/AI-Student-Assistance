# 🎓 AI Student Assistance Platform

An AI-powered student productivity platform that helps students manage tasks, academic schedules, Pomodoro study sessions, flashcard learning, and productivity analytics — all in one unified workspace.

**Live Demo →** [https://ai-student-assistance-pi.vercel.app](https://ai-student-assistance-pi.vercel.app)

Built with **Python, Flask, SQLAlchemy, SQLite, Vanilla JavaScript, Tailwind CSS, Chart.js, and Lucide Icons**.

---

## ✨ Features

### 📊 Student Dashboard
A centralized productivity hub showing:
- Daily tasks and completion status
- Study time and Pomodoro sessions
- Productivity streaks
- Upcoming academic events
- Flashcard progress
- Interactive analytics overview

### 📋 Kanban Task Management
Drag-and-drop academic task board with:
- To Do / In Progress / Completed columns
- Task priorities, categories, and due dates
- Search, filtering, and sorting
- Overdue task indicators

### 📅 Academic Calendar
Interactive calendar supporting event types:
- Classes, Exams, Assignments, Deadlines, Study Sessions

Each event includes title, description, date, start/end time, and category.

### ⏱️ Pomodoro Focus Timer
Customizable study timer with presets:
- **25 min** — Focus
- **5 min** — Short Break
- **15 min** — Long Break

Completed sessions are logged and tracked in analytics.

### 🧠 AI Flashcard Generation
Convert study material into flashcards from topics, notes, lecture content, or any study text. Powered by **Google Gemini API** with a built-in **Smart Heuristic Extraction Engine** as a local fallback when no API key is configured.

### 📚 Flashcard Study Mode
Active recall study system with:
- Flashcard decks with difficulty levels
- Mastery percentage tracking
- Fullscreen study mode
- Keyboard shortcuts (`Space` to flip, `1` needs review, `2` mastered, `←/→` navigate)

### 📈 Productivity Analytics
Chart.js-powered dashboards tracking:
- Tasks completed per day
- Study hours and Pomodoro sessions
- Task and category distribution
- Productivity trends and streaks

### 🔐 User Authentication
- Registration and login
- JWT-based authorization
- Password hashing (Werkzeug)
- User-scoped data access

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│          Vercel (Frontend)               │
│   HTML · Vanilla JS · Tailwind · Charts  │
│   https://ai-student-assistance-pi.      │
│               vercel.app                 │
└──────────────────┬───────────────────────┘
                   │  HTTPS REST API
                   ▼
┌──────────────────────────────────────────┐
│          Render (Backend)                │
│        Python · Flask · Gunicorn         │
│   https://ai-student-assistance.         │
│             onrender.com                 │
└──────────────────┬───────────────────────┘
                   │  SQLAlchemy ORM
                   ▼
┌──────────────────────────────────────────┐
│         SQLite (WAL mode)                │
│    Persistent via SQLITE_PATH env var    │
└──────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Frontend       | HTML5, Vanilla JavaScript                     |
| Styling        | Tailwind CSS, Custom CSS                      |
| Charts         | Chart.js                                      |
| Icons          | Lucide                                        |
| Backend        | Python 3.10+, Flask                           |
| API            | REST (JSON)                                   |
| ORM            | SQLAlchemy                                    |
| Database       | SQLite (WAL mode) · PostgreSQL ready          |
| Auth           | JWT + Werkzeug password hashing               |
| AI             | Google Gemini API + local heuristic fallback  |
| Testing        | Python unittest (8 test cases)                |
| Frontend Host  | Vercel                                        |
| Backend Host   | Render                                        |

---

## 📁 Project Structure

```
AI-Student-Assistance/
│
├── backend/
│   ├── app.py                  # App factory, Gunicorn entry point
│   ├── config.py               # Environment-based configuration
│   ├── requirements.txt
│   ├── .env.example            # Safe template — no real secrets
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── calendar_event.py
│   │   ├── study_session.py
│   │   └── flashcard.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── tasks.py
│   │   ├── calendar.py
│   │   ├── sessions.py
│   │   ├── flashcards.py
│   │   ├── ai.py
│   │   └── analytics.py
│   │
│   ├── services/
│   │   ├── ai_service.py
│   │   └── analytics_service.py
│   │
│   ├── utils/
│   │   ├── auth_middleware.py
│   │   └── helpers.py
│   │
│   └── tests/
│       └── test_api.py         # 8 test cases covering full auth + features
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── README.md
└── .gitignore
```

---

## 🚀 Local Development

### Prerequisites
- Python 3.10+
- pip
- Google Gemini API key *(optional)*

### 1. Clone the repository

```bash
git clone https://github.com/Ali-Zoya/AI-Student-Assistance.git
cd AI-Student-Assistance
```

### 2. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
SECRET_KEY=your-strong-random-secret-key
JWT_SECRET_KEY=your-strong-random-jwt-key
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000

# Optional — leave blank to use the local heuristic fallback
GEMINI_API_KEY=your-gemini-api-key

# Optional — leave blank to use default SQLite path
SQLITE_PATH=
```

> **Never commit `.env` to Git.** It is listed in `.gitignore`.

### 4. Run the application

```bash
python backend/app.py
```

Open [http://localhost:5000](http://localhost:5000) — Flask serves both the API and the frontend.

---

## ☁️ Deployment

### Backend — Render

| Setting        | Value                                      |
|----------------|--------------------------------------------|
| Root Directory | `backend`                                  |
| Build Command  | `pip install -r requirements.txt`          |
| Start Command  | `gunicorn app:app`                         |

**Required environment variables on Render:**

| Key              | Value                                              |
|------------------|----------------------------------------------------|
| `SECRET_KEY`     | Generate a strong random string                    |
| `JWT_SECRET_KEY` | Generate a separate strong random string           |
| `FLASK_ENV`      | `production`                                       |
| `SQLITE_PATH`    | `/opt/render/project/src/student_assistance.db`    |
| `GEMINI_API_KEY` | Your Google Gemini API key *(optional)*            |

> Do **not** set `SEED_DEMO_ACCOUNT=true` in production unless you explicitly want a demo account created on a fresh deploy.

### Frontend — Vercel

Deploy the `frontend/` directory. Set the **API base URL** in `frontend/app.js` to point to your Render backend:

```js
const API_BASE = "https://ai-student-assistance.onrender.com/api";
```

Vercel requires no build step — it serves the static files directly.

---

## 🧪 Testing

Run the full backend test suite:

```bash
python -m unittest discover -s backend/tests -v
```

**Test coverage (8 test cases):**

| Test | Coverage |
|------|----------|
| `test_auth_flow` | Register, login, bad password, unregistered email, JWT, protected route |
| `test_all_eight_scenarios_lifecycle` | Full 8-scenario lifecycle test |
| `test_tasks_crud_and_kanban` | Task create, update status, delete |
| `test_calendar_crud` | Calendar event create, toggle, delete |
| `test_pomodoro_session_and_analytics` | Session logging, analytics aggregation |
| `test_flashcards_and_study_mode` | Deck creation, flashcard CRUD, review |
| `test_ai_flashcard_generation_fallback` | AI generation with local fallback |
| `test_frontend_static_serving` | Static file serving for frontend assets |

Frontend syntax check:

```bash
node --check frontend/app.js
```

---

## 📡 REST API Reference

### Authentication

| Method | Endpoint              | Auth | Description          |
|--------|-----------------------|------|----------------------|
| POST   | `/api/auth/register`  | No   | Create account       |
| POST   | `/api/auth/login`     | No   | Login, receive JWT   |
| GET    | `/api/auth/me`        | Yes  | Get current user     |
| POST   | `/api/auth/logout`    | Yes  | Logout               |

### Tasks

| Method | Endpoint           | Auth | Description              |
|--------|--------------------|------|--------------------------|
| GET    | `/api/tasks`       | Yes  | List tasks (filterable)  |
| POST   | `/api/tasks`       | Yes  | Create task              |
| PUT    | `/api/tasks/<id>`  | Yes  | Update task              |
| DELETE | `/api/tasks/<id>`  | Yes  | Delete task              |

### Academic Calendar

| Method | Endpoint                     | Auth | Description       |
|--------|------------------------------|------|-------------------|
| GET    | `/api/calendar`              | Yes  | List events       |
| POST   | `/api/calendar`              | Yes  | Create event      |
| PUT    | `/api/calendar/<id>`         | Yes  | Update event      |
| POST   | `/api/calendar/<id>/toggle`  | Yes  | Toggle completion |
| DELETE | `/api/calendar/<id>`         | Yes  | Delete event      |

### Pomodoro Sessions

| Method | Endpoint         | Auth | Description            |
|--------|------------------|------|------------------------|
| GET    | `/api/sessions`  | Yes  | List sessions          |
| POST   | `/api/sessions`  | Yes  | Record completed session |

### Flashcards

| Method | Endpoint                        | Auth | Description          |
|--------|---------------------------------|------|----------------------|
| GET    | `/api/flashcards`               | Yes  | List flashcards      |
| POST   | `/api/flashcards`               | Yes  | Create flashcard     |
| DELETE | `/api/flashcards/<id>`          | Yes  | Delete flashcard     |
| POST   | `/api/flashcards/<id>/review`   | Yes  | Record review result |
| GET    | `/api/flashcards/decks`         | Yes  | List decks           |
| POST   | `/api/flashcards/decks`         | Yes  | Create deck          |
| POST   | `/api/flashcards/generate`      | Yes  | AI generate cards    |

### Analytics

| Method | Endpoint          | Auth | Description               |
|--------|-------------------|------|---------------------------|
| GET    | `/api/analytics`  | Yes  | Productivity analytics    |

### Health

| Method | Endpoint        | Auth | Description      |
|--------|-----------------|------|------------------|
| GET    | `/api/health`   | No   | Server status    |

> All authenticated endpoints require the `Authorization: Bearer <token>` header.

---

## 🔐 Security Notes

- Passwords are hashed with **Werkzeug** (PBKDF2-SHA256). Plain-text passwords are never stored.
- JWTs are signed with `JWT_SECRET_KEY` — keep this strong and secret.
- **Never commit `.env` files, `*.db` database files, or API keys to Git.** All are listed in `.gitignore`.
- The `SEED_DEMO_ACCOUNT` env var is `false` by default — no predictable demo credentials in production.
- SQLite runs in **WAL mode** for concurrent read safety on Render.

---

## 📄 License

This project is developed for educational and portfolio purposes.
