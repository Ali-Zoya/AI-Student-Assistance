# 🎓 AI Student Assistance

<<<<<<< HEAD
A SaaS-style client-side productivity workspace built for students to streamline task organization, flashcard synthesis, and academic scheduling. This project features a clean, responsive dual-tone dashboard, interactive widgets, local offline failover, and a live REST API logging console, designed to match the modern aesthetics of Vercel and Linear.
=======
A production-grade, full-stack **AI-powered student productivity platform** combining Kanban task management, academic scheduling, Pomodoro focus tracking, interactive productivity analytics, AI flashcard synthesis, and active recall study mode.

Built with **Python + Flask**, **PostgreSQL / SQLite via SQLAlchemy**, **Tailwind CSS**, and **Chart.js**.
>>>>>>> df1e5fd (Upgrade AI Student Assistance platform)

---

## ⚡ Core Features

<<<<<<< HEAD
- **📊 Operations Dashboard**: Real-time productivity telemetry tracking weekly study metrics (using interactive Chart.js line graphs), active queue checklists, and completed sessions.
- **📋 Kanban Task Backlog**: A drag-and-drop workflow pipeline containing task cards, priority indicators (High, Medium, Low), category badges, and due dates.
- **📅 Study Scheduler**: An interactive monthly grid calendar modal allowing students to insert, update, and manage academic agenda items.
- **⏱️ Cognitive Pomodoro Timer**: A circular SVG progress countdown clock supporting user session goals (25m / 50m / 15m presets) and history logs.
- **🧠 AI Flashcard Deck**: A 3D-flipping flashcard study engine that supports custom topic filtering and card creation.
- **🛠️ PostgreSQL Telemetry Console**: A simulated developer console logging client-side REST database operations (`GET`, `POST`, `PUT`, `DELETE`) with realistic latency mappings and database keys.
=======
- **📊 Operations Dashboard**: Real-time academic command center answering:
  1. *What do I need to do today?* (Prioritized daily backlog checklist with 1-click completion).
  2. *How productive have I been?* (Study minutes, streak counter, task completion progress bar).
  3. *What should I study next?* (AI recommendation linking to upcoming exams or lowest mastery flashcard deck).
- **📋 Kanban Task Pipeline**: Full drag-and-drop workflow across **Planned Backlog (To Do)**, **In Progress**, and **Verified Finished (Completed)**. Includes instant search, category filters, priority indicators (High, Medium, Low), sort orders, and **overdue task warning badges**.
- **📅 Academic Class & Agenda Scheduler**: Monthly interactive grid with color-coded categories:
  - Classes (Blue)
  - Exams (Red)
  - Assignments (Amber)
  - Deadlines (Purple)
  - Study Sessions (Emerald)
  - Other (Slate)
  Includes start/end times, upcoming agenda list, and completion toggles.
- **⏱️ Cognitive Pomodoro Focus**: Circular SVG countdown with customizable presets (25m Focus, 5m Short Break, 15m Long Break) and custom durations. Automatically commits completed study sessions to the backend database to track focus telemetry and daily streaks.
- **🧠 AI Flashcard Synthesis & Study System**:
  - Genuine AI-powered flashcard generation from topics, lecture transcripts, and study notes.
  - **Pre-Save Review Modal**: Inspect, edit questions/answers/difficulty, discard unwanted cards, and select target deck before committing.
  - **Transparent Fallback**: When an external AI key (`GEMINI_API_KEY`) is not configured, the system uses an intelligent **Smart Heuristic Extraction Engine** (clearly labeled) so the app remains fully functional without fake claims.
  - **Dedicated Study Mode**: Fullscreen/distraction-free study interface with 3D card flips, keyboard shortcuts (`Space` to flip, `1` for Needs Review, `2` for Mastered, Arrow keys for navigation), and live mastery tracking (e.g. *7 / 20 cards reviewed • 70% mastered*).
- **📈 Productivity Intelligence Analytics**:
  - Tasks Completed Per Day (Bar chart, last 7 days)
  - Daily Study Hours & Pomodoro Session trends (Area line chart)
  - Backlog Status Distribution (Donut chart)
  - Academic Category Breakdown (Horizontal bar chart)
- **🔐 Secure User Accounts**: Full user authentication with registration, login, JWT token authorization, and salted password hashing (`scrypt`/`pbkdf2:sha256`). All data is strictly scoped to the authenticated user.
- **🛠️ Live REST API Telemetry Console**: Real-time developer logging monitor tracking every HTTP call (`method`, `url`, `status`, `latency in ms`).

---

## 🏗️ Backend Architecture

```
backend/
├── app.py                      # Flask app factory, static serving, DB initialization
├── config.py                   # Configuration, PostgreSQL / SQLite URI, JWT settings
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables
├── models/
│   ├── __init__.py             # SQLAlchemy instance and model exports
│   ├── user.py                 # User model with secure password hashing
│   ├── task.py                 # Task model (Kanban statuses, priorities, dates)
│   ├── calendar_event.py       # Academic event model with times and categories
│   ├── study_session.py        # Pomodoro study session logs
│   └── flashcard.py            # FlashcardDeck and Flashcard models
├── routes/
│   ├── __init__.py
│   ├── auth.py                 # /api/auth (register, login, me, logout)
│   ├── tasks.py                # /api/tasks (CRUD, filters, reorder)
│   ├── calendar.py             # /api/calendar (CRUD, date filtering)
│   ├── sessions.py             # /api/sessions (Pomodoro logging)
│   ├── flashcards.py           # /api/flashcards & /api/flashcards/decks
│   ├── ai.py                   # /api/flashcards/generate
│   └── analytics.py            # /api/analytics (Productivity metrics)
├── services/
│   ├── __init__.py
│   ├── ai_service.py           # Gemini AI synthesis + Heuristic fallback
│   └── analytics_service.py    # Multi-dimensional metric aggregation
├── utils/
│   ├── __init__.py
│   ├── auth_middleware.py      # JWT @token_required decorator
│   └── helpers.py              # Validation and response helpers
└── tests/
    └── test_api.py             # Complete automated test suite
```
>>>>>>> df1e5fd (Upgrade AI Student Assistance platform)

---

## 🚀 How to Run Locally

<<<<<<< HEAD
### Approach 1: Simple Local Server (Recommended)
Static pages function best when served via HTTP rather than straight filenames (`file://`). Open a terminal in the project directory and run one of the following:

- **Node.js**:
  ```bash
  npx http-server -p 8000
  ```
- **Python**:
  ```bash
  python -m http.server 8000
  ```

Open your browser and navigate to: **`http://localhost:8000`**

### Approach 2: Direct Browser Entry
You can also launch the platform by double-clicking the physical `index.html` file inside your explorer to run the page in "Offline Storage" fallback mode.

---

## 🔑 Authentication
The frontend implements an **Auto-Registration** workflow:
* Enter any email (e.g. `student@domain.com`) and any 6-digit password.
* The Client API automatically initializes a fresh profile container inside `localStorage` for that user.

---

## 🛠️ Tech Stack & Design Tokens
* **Markup & Core Logic**: HTML5, Vanilla JavaScript.
* **Styling Layer**: Tailwind CSS CDN, Custom CSS Glassmorphic Overrides.
* **Database Telemetry**: Simulated PostgreSQL REST handler with local persistence.
* **Libraries**: Lucide Icon set, Chart.js.
=======
### 1. Install Dependencies
Ensure you have Python 3.10+ installed:
```bash
pip install -r backend/requirements.txt
```

### 2. Configure Database & Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```
- **PostgreSQL**: Set `DATABASE_URL=postgresql://username:password@localhost:5432/student_assistance`.
- **Zero Configuration (SQLite Fallback)**: If `DATABASE_URL` is left empty or PostgreSQL is not running, the application **automatically initializes and uses a local SQLite database** (`student_assistance.db`) so it works immediately out of the box!
- **AI Integration (Optional)**: Provide `GEMINI_API_KEY` for Google Gemini flashcard generation. If omitted, the platform uses the built-in Smart Heuristic Extraction engine.

### 3. Start the Application Server
Run the Flask server:
```bash
python backend/app.py
```
Open your browser and navigate to: **`http://localhost:5000`**

The server automatically serves both the API endpoints and the frontend interface!

---

## 🧪 Running Automated Tests

Run the backend unit test suite:
```bash
python -m unittest backend/tests/test_api.py
```
This validates user registration, JWT authentication, task Kanban updates, calendar scheduling, Pomodoro session logging, flashcard deck mastery, and AI extraction fallback.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register`: Create account (`email`, `password`, `name`)
- `POST /api/auth/login`: Authenticate and receive JWT (`email`, `password`)
- `GET /api/auth/me`: Query current authenticated profile
- `POST /api/auth/logout`: Invalidate session

### Tasks (Kanban)
- `GET /api/tasks`: List tasks (filters: `search`, `category`, `priority`, `sort`)
- `POST /api/tasks`: Create task (`title`, `description`, `category`, `priority`, `due_date`, `status`)
- `PUT /api/tasks/<id>`: Update task properties or move Kanban column
- `DELETE /api/tasks/<id>`: Remove task

### Academic Calendar
- `GET /api/calendar`: List events (filters: `month`, `date`, `category`)
- `POST /api/calendar`: Schedule event (`title`, `description`, `event_date`, `start_time`, `end_time`, `category`)
- `PUT /api/calendar/<id>`: Edit event
- `POST /api/calendar/<id>/toggle`: Toggle completion status
- `DELETE /api/calendar/<id>`: Remove event

### Pomodoro Focus Sessions
- `GET /api/sessions`: Query study session history
- `POST /api/sessions`: Log completed session (`duration_minutes`, `session_type`, `topic`)

### AI Flashcards & Study Decks
- `GET /api/flashcards/decks`: List user decks with mastery percentages
- `POST /api/flashcards/decks`: Create deck (`title`, `description`, `color`)
- `GET /api/flashcards`: List flashcards (filters: `deck_id`, `topic`, `difficulty`, `search`)
- `POST /api/flashcards`: Create flashcard(s)
- `POST /api/flashcards/<id>/review`: Record active recall result (`is_known: true/false`)
- `DELETE /api/flashcards/<id>`: Remove flashcard
- `POST /api/flashcards/generate`: Synthesize flashcards from text notes

### Productivity Analytics
- `GET /api/analytics`: Retrieve aggregated weekly performance, study hours, and task distribution datasets.
>>>>>>> df1e5fd (Upgrade AI Student Assistance platform)
