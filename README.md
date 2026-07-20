# 🎓 AI Student Assistance

A SaaS-style client-side productivity workspace built for students to streamline task organization, flashcard synthesis, and academic scheduling. This project features a clean, responsive dual-tone dashboard, interactive widgets, local offline failover, and a live REST API logging console, designed to match the modern aesthetics of Vercel and Linear.

---

## ⚡ Core Features

- **📊 Operations Dashboard**: Real-time productivity telemetry tracking weekly study metrics (using interactive Chart.js line graphs), active queue checklists, and completed sessions.
- **📋 Kanban Task Backlog**: A drag-and-drop workflow pipeline containing task cards, priority indicators (High, Medium, Low), category badges, and due dates.
- **📅 Study Scheduler**: An interactive monthly grid calendar modal allowing students to insert, update, and manage academic agenda items.
- **⏱️ Cognitive Pomodoro Timer**: A circular SVG progress countdown clock supporting user session goals (25m / 50m / 15m presets) and history logs.
- **🧠 AI Flashcard Deck**: A 3D-flipping flashcard study engine that supports custom topic filtering and card creation.
- **🛠️ PostgreSQL Telemetry Console**: A simulated developer console logging client-side REST database operations (`GET`, `POST`, `PUT`, `DELETE`) with realistic latency mappings and database keys.

---

## 🚀 How to Run Locally

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
