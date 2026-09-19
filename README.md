# 🎓 AI Student Assistance Platform

An AI-powered student productivity platform designed to help students manage tasks, academic schedules, study sessions, productivity, and flashcard-based learning in one unified workspace.

Built with **Python, Flask, SQLAlchemy, PostgreSQL/SQLite, Vanilla JavaScript, Tailwind CSS, Chart.js, and Lucide**.

---

## ✨ Features

### 📊 Student Dashboard

A centralized productivity dashboard that provides an overview of:

* Daily tasks
* Study time
* Completed tasks
* Productivity streaks
* Upcoming academic events
* Flashcard progress
* Productivity analytics

---

### 📋 Kanban Task Management

Manage academic and personal tasks through a drag-and-drop Kanban workflow.

* To Do
* In Progress
* Completed
* Task priorities
* Categories
* Due dates
* Search and filtering
* Sorting
* Overdue task indicators

---

### 📅 Academic Calendar

Organize academic activities using an interactive calendar.

Supported event types include:

* Classes
* Exams
* Assignments
* Deadlines
* Study Sessions
* Other events

Each event can include a title, description, date, start time, end time, and category.

---

### ⏱️ Pomodoro Focus Timer

A customizable Pomodoro timer designed to support focused study sessions.

Default presets:

* **25 minutes — Focus**
* **5 minutes — Short Break**
* **15 minutes — Long Break**

Completed study sessions are recorded and used for productivity tracking.

---

### 🧠 AI Flashcard Generation

Generate flashcards from study material such as:

* Topics
* Notes
* Lecture content
* Study text

The application supports AI-powered flashcard generation through the backend.

Generated flashcards can be reviewed and edited before being saved.

When an external AI key is unavailable, the application uses a clearly identified **Smart Heuristic Extraction Engine** as a local fallback.

---

### 📚 Flashcard Study Mode

Study using interactive flashcards and active recall.

Features include:

* Flashcard decks
* Question/answer cards
* Difficulty levels
* Card editing
* Card deletion
* Topic filtering
* Active recall tracking
* Mastery percentage
* Fullscreen study mode
* Keyboard shortcuts

Example keyboard controls:

| Key     | Action           |
| ------- | ---------------- |
| `Space` | Flip card        |
| `1`     | Needs Review     |
| `2`     | Mark as Mastered |
| `← / →` | Navigate cards   |

---

### 📈 Productivity Analytics

Interactive analytics powered by **Chart.js**.

The dashboard tracks:

* Tasks completed per day
* Study hours
* Pomodoro sessions
* Task status distribution
* Academic category distribution
* Productivity trends

---

### 🔐 User Authentication

The platform includes user authentication with:

* Registration
* Login
* Logout
* JWT authorization
* Password hashing
* User-specific data access

Application data is scoped to the authenticated user.

---

### 🛠️ REST API

The frontend communicates with the Flask backend through REST APIs.

The application provides APIs for:

* Authentication
* Tasks
* Calendar events
* Study sessions
* Flashcards
* AI flashcard generation
* Productivity analytics

---

# 🏗️ Architecture

The application follows a full-stack architecture:

```text
                ┌─────────────────────┐
                │       Student       │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  Frontend Interface │
                │ HTML / JavaScript   │
                │ Tailwind / Charts   │
                └──────────┬──────────┘
                           │
                       REST API
                           │
                           ▼
                ┌─────────────────────┐
                │    Flask Backend    │
                │  Authentication     │
                │  Business Logic     │
                │  API Routes         │
                └──────────┬──────────┘
                           │
                       SQLAlchemy
                           │
                           ▼
                ┌─────────────────────┐
                │ PostgreSQL / SQLite │
                └─────────────────────┘
```

### AI Flashcard Workflow

```text
Study Material
      │
      ▼
Frontend
      │
      ▼
Flask API
      │
      ▼
AI Service
      │
      ▼
Generated Flashcards
      │
      ▼
Review / Edit
      │
      ▼
Database
```

---

# 🛠️ Tech Stack

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Frontend       | HTML5, Vanilla JavaScript          |
| Styling        | Tailwind CSS, Custom CSS           |
| Backend        | Python, Flask                      |
| API            | REST APIs                          |
| ORM            | SQLAlchemy                         |
| Database       | PostgreSQL / SQLite                |
| Authentication | JWT                                |
| AI             | Google Gemini API + local fallback |
| Charts         | Chart.js                           |
| Icons          | Lucide                             |
| Testing        | Python unittest                    |

---

# 📁 Project Structure

```text
AI-Student-Assistance/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── calendar_event.py
│   │   ├── study_session.py
│   │   └── flashcard.py
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── tasks.py
│   │   ├── calendar.py
│   │   ├── sessions.py
│   │   ├── flashcards.py
│   │   ├── ai.py
│   │   └── analytics.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py
│   │   └── analytics_service.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── auth_middleware.py
│   │   └── helpers.py
│   │
│   └── tests/
│       └── test_api.py
│
├── index.html
├── app.js
├── style.css
├── demo.html
├── README.md
└── .gitignore
```

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

* Python 3.10+
* pip
* PostgreSQL (optional)
* Google Gemini API key (optional)

---

## 1. Install Dependencies

From the project root:

```bash
pip install -r backend/requirements.txt
```

---

## 2. Configure Environment Variables

Create a `.env` file based on:

```text
backend/.env.example
```

Example configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/student_assistance
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

### Database

PostgreSQL can be used as the primary database.

The application also supports a local SQLite fallback when PostgreSQL is not configured, allowing the project to run locally without requiring a PostgreSQL server.

### AI

`GEMINI_API_KEY` is optional.

When it is not configured, the application uses the built-in Smart Heuristic Extraction Engine as a local fallback.

---

## 3. Start the Application

Run:

```bash
python backend/app.py
```

Then open:

```text
http://localhost:5000
```

The Flask server provides the backend API and serves the frontend application.

---

# 🧪 Testing

Run the backend test suite with:

```bash
python -m unittest backend/tests/test_api.py
```

The tests cover core functionality including:

* User registration
* Authentication
* Task management
* Kanban updates
* Calendar scheduling
* Pomodoro session logging
* Flashcard functionality
* AI extraction fallback

---

# 📡 REST API

## Authentication

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Create a new account |
| POST   | `/api/auth/login`    | Authenticate a user  |
| GET    | `/api/auth/me`       | Get current user     |
| POST   | `/api/auth/logout`   | Log out              |

---

## Tasks

| Method | Endpoint          | Description    |
| ------ | ----------------- | -------------- |
| GET    | `/api/tasks`      | Retrieve tasks |
| POST   | `/api/tasks`      | Create a task  |
| PUT    | `/api/tasks/<id>` | Update a task  |
| DELETE | `/api/tasks/<id>` | Delete a task  |

Supported task filters include search, category, priority, and sorting.

---

## Academic Calendar

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/api/calendar`             | Retrieve calendar events |
| POST   | `/api/calendar`             | Create an event          |
| PUT    | `/api/calendar/<id>`        | Update an event          |
| POST   | `/api/calendar/<id>/toggle` | Toggle completion        |
| DELETE | `/api/calendar/<id>`        | Delete an event          |

---

## Pomodoro Sessions

| Method | Endpoint        | Description                |
| ------ | --------------- | -------------------------- |
| GET    | `/api/sessions` | Retrieve study sessions    |
| POST   | `/api/sessions` | Record a completed session |

---

## Flashcards

| Method | Endpoint                      | Description         |
| ------ | ----------------------------- | ------------------- |
| GET    | `/api/flashcards`             | Retrieve flashcards |
| POST   | `/api/flashcards`             | Create flashcards   |
| DELETE | `/api/flashcards/<id>`        | Delete a flashcard  |
| POST   | `/api/flashcards/<id>/review` | Record study result |

---

## Flashcard Decks

| Method | Endpoint                | Description    |
| ------ | ----------------------- | -------------- |
| GET    | `/api/flashcards/decks` | Retrieve decks |
| POST   | `/api/flashcards/decks` | Create a deck  |

---

## AI Flashcards

| Method | Endpoint                   | Description                             |
| ------ | -------------------------- | --------------------------------------- |
| POST   | `/api/flashcards/generate` | Generate flashcards from study material |

---

## Analytics

| Method | Endpoint         | Description                     |
| ------ | ---------------- | ------------------------------- |
| GET    | `/api/analytics` | Retrieve productivity analytics |

---

# 🤖 AI Flashcard Generation

The AI flashcard system allows students to convert study material into structured flashcards.

The workflow is:

1. Student enters study material.
2. Frontend sends the content to the Flask API.
3. Flask passes the content to the AI service.
4. Generated flashcards are returned.
5. Student reviews and edits the cards.
6. Approved cards are saved to a flashcard deck.
7. Study progress is tracked through the active recall system.

If the Gemini API is unavailable, the application uses a clearly labeled local extraction fallback.

---

# 🔐 Authentication & Security

The application implements:

* Password hashing
* JWT-based authentication
* Protected API routes
* User-specific data access
* Environment-based configuration
* Server-side AI API key handling

Sensitive credentials should never be committed to the repository.

---

# 📊 Productivity Tracking

The platform combines task and study data to provide students with a view of their productivity.

Tracked information includes:

* Completed tasks
* Study minutes
* Pomodoro sessions
* Task distribution
* Flashcard mastery
* Productivity trends
* Study streaks

This information is visualized through the dashboard and Chart.js-based analytics.

---

# 🎯 Project Highlights

* Full-stack student productivity platform
* Flask REST API architecture
* PostgreSQL / SQLite database support
* SQLAlchemy ORM
* JWT authentication
* AI-assisted flashcard generation
* Interactive Kanban task management
* Academic calendar
* Pomodoro focus tracking
* Active recall flashcard study mode
* Chart.js productivity analytics
* Responsive student-focused interface

---

## 📄 License

This project is developed for educational and portfolio purposes.
