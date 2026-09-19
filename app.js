// ==========================================================
// AI Student Assistance - Core Application Engine v2.0
// ==========================================================

// Global State Container
const state = {
  user: null,
  token: localStorage.getItem("authToken") || null,
  activeTab: "dashboard",
  tasks: [],
  calendarEvents: [],
  decks: [],
  flashcards: [],
  analytics: null,
  pomodoro: {
    mode: "focus", // 'focus', 'short_break', 'long_break'
    minutes: 25,
    seconds: 0,
    totalTime: 1500, // in seconds
    isRunning: false,
    interval: null,
    sessionsCompleted: 0,
    todayFocusMinutes: 0,
    weeklyFocusMinutes: 0,
    currentStreak: 0,
    topic: ""
  },
  studyMode: {
    isActive: false,
    deckId: null,
    deckTitle: "",
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    reviewedCount: 0,
    knownCount: 0
  },
  aiReview: {
    cards: [],
    source: "ai",
    sourceLabel: ""
  },
  devLogs: [],
  charts: {
    dashboard: null,
    tasksPerDay: null,
    studyHours: null,
    taskStatusDonut: null,
    categoryBar: null
  }
};

// Determine API base url (supports both direct static hosting and standalone flask)
const API_BASE = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";

// ==================== TELEMETRY & HTTP LAYER ====================

function logDevConsole(method, endpoint, status, latency) {
  const time = new Date().toLocaleTimeString();
  const log = { time, method, endpoint, status, latency };
  state.devLogs.unshift(log);
  if (state.devLogs.length > 30) state.devLogs.pop();

  const container = document.getElementById("apiLogConsole");
  if (!container) return;

  container.innerHTML = state.devLogs.map(l => {
    let methodColor = "text-emerald-400";
    if (l.method === "POST") methodColor = "text-blue-400";
    if (l.method === "DELETE") methodColor = "text-rose-400";
    if (l.method === "PUT") methodColor = "text-amber-400";

    const isSuccess = String(l.status).startsWith("2");
    const statusBg = isSuccess ? "bg-emerald-950/60 text-emerald-300 border-emerald-800" : "bg-rose-950/60 text-rose-300 border-rose-800";

    return `
      <div class="font-mono text-[11px] mb-1.5 flex items-center justify-between border-b border-slate-800/80 pb-1 opacity-95">
        <div class="truncate max-w-[280px]">
          <span class="text-slate-500">[${l.time}]</span>
          <span class="${methodColor} font-bold mr-1.5">${l.method}</span>
          <span class="text-slate-300 font-medium">${l.endpoint}</span>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          <span class="text-[9px] px-1.5 py-0.2 rounded border font-bold ${statusBg}">${l.status}</span>
          <span class="text-slate-400 font-semibold text-[10px]">${l.latency}ms</span>
        </div>
      </div>
    `;
  }).join("");
}

function clearTelemetryLogs() {
  state.devLogs = [];
  const container = document.getElementById("apiLogConsole");
  if (container) {
    container.innerHTML = `<div class="text-center text-slate-500 text-xs font-medium py-32">Telemetry logs cleared. New queries will appear here.</div>`;
  }
}

async function apiRequest(endpoint, options = {}) {
  const start = performance.now();
  const method = options.method || "GET";
  const url = `${API_BASE}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const latency = Math.round(performance.now() - start);
    const statusText = `${response.status} ${response.statusText}`;
    logDevConsole(method, endpoint, statusText, latency);

    if (response.status === 401) {
      // Session expired or invalid
      if (state.token) {
        logout();
        showToast("Session expired. Please sign in again.", "error");
      }
      return { success: false, error: "Unauthorized" };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    logDevConsole(method, endpoint, "Offline / Error", latency);
    console.error(`[API Error] ${method} ${endpoint}:`, err);
    return { success: false, error: "Failed to connect to backend server. Make sure the Flask server is running." };
  }
}

// Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-msg";

  let iconName = "info";
  let iconColor = "text-blue-400";
  if (type === "success") {
    iconName = "check-circle-2";
    iconColor = "text-emerald-400";
  } else if (type === "error") {
    iconName = "alert-circle";
    iconColor = "text-rose-400";
  }

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor} flex-shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==================== APP INITIALIZATION ====================

let authMode = "login"; // 'login' or 'register'

document.addEventListener("DOMContentLoaded", async () => {
  setupKeyboardShortcuts();

  const storedToken = localStorage.getItem("authToken");
  if (storedToken) {
    state.token = storedToken;
    const res = await apiRequest("/auth/me");
    if (res.success && res.data && res.data.user) {
      setUserSession(res.data.user, storedToken);
      await loadAllData();
      showTab("dashboard");
      return;
    }
  }

  // Not logged in -> Show login view
  showAuthView();
});

function setUserSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUser", JSON.stringify(user));

  document.getElementById("userDisplayName").textContent = user.name || "Student";
  document.getElementById("userEmail").textContent = user.email || "";
  document.getElementById("userAvatarInitial").textContent = (user.name || user.email || "S")[0].toUpperCase();

  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("mainContent").classList.remove("hidden");
}

function showAuthView() {
  document.getElementById("mainContent").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

function switchAuthMode(mode) {
  authMode = mode;
  const tabLogin = document.getElementById("authTabLogin");
  const tabRegister = document.getElementById("authTabRegister");
  const nameGroup = document.getElementById("authNameGroup");
  const submitText = document.getElementById("authSubmitText");
  const errorAlert = document.getElementById("authErrorAlert");

  if (errorAlert) errorAlert.classList.add("hidden");

  if (mode === "register") {
    tabRegister.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-blue-600 shadow-sm";
    tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800";
    nameGroup.classList.remove("hidden");
    submitText.textContent = "Create Student Account";
  } else {
    tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-blue-600 shadow-sm";
    tabRegister.className = "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800";
    nameGroup.classList.add("hidden");
    submitText.textContent = "Authorize Access";
  }
}

async function handleAuthSubmit() {
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const nameInput = document.getElementById("authName");
  const errorAlert = document.getElementById("authErrorAlert");
  const errorText = document.getElementById("authErrorText");
  const submitBtn = document.getElementById("authSubmitBtn");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const name = nameInput.value.trim();

  if (!email || !password) {
    errorText.textContent = "Please fill in all required fields.";
    errorAlert.classList.remove("hidden");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-70");

  let res;
  if (authMode === "register") {
    res = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    });
  } else {
    res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }

  submitBtn.disabled = false;
  submitBtn.classList.remove("opacity-70");

  if (res.success && res.data) {
    errorAlert.classList.add("hidden");
    setUserSession(res.data.user, res.data.token);
    showToast(authMode === "register" ? "Account created successfully!" : "Signed in successfully!", "success");
    await loadAllData();
    showTab("dashboard");
  } else {
    errorText.textContent = res.error || "Authentication failed.";
    errorAlert.classList.remove("hidden");
  }
}

// Backward-compatible alias for existing login button
function loginOrCreateAccount() {
  handleAuthSubmit();
}

function logout() {
  if (state.pomodoro.interval) {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.interval = null;
    state.pomodoro.isRunning = false;
  }

  if (state.token) {
    apiRequest("/auth/logout", { method: "POST" });
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  state.token = null;
  state.user = null;

  showAuthView();
  showToast("Disconnected session.", "info");
}

// ==================== DATA LOADING ====================

async function loadAllData() {
  const [tasksRes, calRes, decksRes, cardsRes, analyticsRes] = await Promise.all([
    apiRequest("/tasks"),
    apiRequest("/calendar"),
    apiRequest("/flashcards/decks"),
    apiRequest("/flashcards"),
    apiRequest("/analytics")
  ]);

  if (tasksRes.success) state.tasks = tasksRes.data || [];
  if (calRes.success) state.calendarEvents = calRes.data || [];
  if (decksRes.success) state.decks = decksRes.data || [];
  if (cardsRes.success) state.flashcards = cardsRes.data || [];
  if (analyticsRes.success) state.analytics = analyticsRes.data || null;

  populateTargetDeckSelects();
  checkDbEngineHealth();
}

async function checkDbEngineHealth() {
  try {
    const res = await apiRequest("/health");
    if (res.database) {
      const dbBadge = document.getElementById("dbBadgeText");
      const dbText = document.getElementById("dbIndicatorText");
      const settingsEngine = document.getElementById("settingsDbEngine");
      if (dbBadge) dbBadge.textContent = res.database.toUpperCase();
      if (dbText) dbText.textContent = `${res.database.toUpperCase()} Live`;
      if (settingsEngine) settingsEngine.textContent = res.database.toUpperCase();
    }
  } catch (e) {
    // Ignore health check failure
  }
}

// ==================== NAVIGATION TABS ====================

function showTab(tabId) {
  state.activeTab = tabId;
  const tabs = ["dashboard", "todo", "calendar", "pomodoro", "flashcard", "analytics", "settings"];

  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.add("hidden");

    const btn = document.getElementById(`nav-${t}`);
    if (btn) {
      btn.className = "flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 w-full text-left font-bold text-xs";
    }
  });

  const activePanel = document.getElementById(tabId);
  if (activePanel) activePanel.classList.remove("hidden");

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.className = "flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all sidebar-active w-full text-left font-bold text-xs";
  }

  const titles = {
    dashboard: "Platform Operations Center",
    todo: "Academic Task Pipeline (Kanban)",
    calendar: "Academic Class & Schedule Planner",
    pomodoro: "Cognitive Pomodoro Focus",
    flashcard: "AI Flashcards & Study Decks",
    analytics: "Productivity Intelligence Analytics",
    settings: "Database Console & Telemetry"
  };
  document.getElementById("viewTitleHeader").textContent = titles[tabId] || "Workspace";

  // Trigger tab-specific renders
  if (tabId === "dashboard") renderDashboard();
  else if (tabId === "todo") renderTasks();
  else if (tabId === "calendar") initCalendarGrid();
  else if (tabId === "pomodoro") renderPomodoroFocus();
  else if (tabId === "flashcard") renderFlashcardsTab();
  else if (tabId === "analytics") renderAnalyticsView();

  lucide.createIcons();
}

// ==================== DASHBOARD VIEW ====================

function renderDashboard() {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Answer Question 1: What do I need to do today?
  const todayTasks = state.tasks.filter(t => t.due_date === todayStr);
  const todayTaskList = document.getElementById("dashboardTodayTaskList");
  const todayTasksCountBadge = document.getElementById("todayTasksCountBadge");

  if (todayTasksCountBadge) todayTasksCountBadge.textContent = `${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'}`;

  if (todayTaskList) {
    if (todayTasks.length === 0) {
      todayTaskList.innerHTML = `
        <div class="p-4 rounded-xl bg-white border border-slate-100 text-center text-slate-400 text-xs">
          <i data-lucide="sparkles" class="w-4 h-4 mx-auto mb-1 text-blue-500"></i>
          No tasks due today. You're completely caught up!
        </div>
      `;
    } else {
      todayTaskList.innerHTML = todayTasks.map(t => {
        const isDone = t.status === "completed";
        let priBadge = "bg-slate-100 text-slate-600";
        if (t.priority === "high") priBadge = "bg-rose-50 text-rose-600 border border-rose-100";
        if (t.priority === "medium") priBadge = "bg-amber-50 text-amber-600 border border-amber-100";

        return `
          <div class="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all shadow-card group">
            <div class="flex items-center space-x-2.5 min-w-0">
              <button onclick="toggleTaskComplete('${t.id}')" class="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <i data-lucide="${isDone ? 'check-circle-2' : 'circle'}" class="w-4 h-4 ${isDone ? 'text-emerald-500' : ''}"></i>
              </button>
              <span class="text-xs font-bold text-slate-700 truncate ${isDone ? 'line-through text-slate-400' : ''}">${t.title || t.text}</span>
            </div>
            <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${priBadge} flex-shrink-0">${t.priority}</span>
          </div>
        `;
      }).join("");
    }
  }

  // 2. Answer Question 2: How productive have I been?
  const completedTasks = state.tasks.filter(t => t.status === "completed").length;
  const totalTasks = state.tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayMinutes = state.analytics?.overview?.today_study_minutes || state.pomodoro.todayFocusMinutes || 0;
  const streak = state.analytics?.overview?.current_streak || 0;

  document.getElementById("dashTodayFocusTime").textContent = `${todayMinutes}m`;
  document.getElementById("dashCompletionRatio").textContent = `${completionPct}%`;
  document.getElementById("dashProgressPctText").textContent = `${completedTasks}/${totalTasks} (${completionPct}%)`;
  document.getElementById("dashProgressBar").style.width = `${completionPct}%`;
  document.getElementById("dashStreakValue").textContent = `${streak} Day Streak`;

  // 3. Answer Question 3: What should I study next?
  renderDashboardStudyRecommendation();

  // 4. Update Summary Metric Cards
  document.getElementById("statFocusHours").textContent = `${state.analytics?.overview?.total_focus_minutes || todayMinutes}m`;
  document.getElementById("statCompletedTasks").textContent = `${completedTasks} / ${totalTasks}`;

  const upcomingEventsCount = state.calendarEvents.filter(e => {
    const d = e.event_date || e.date;
    return d && d >= todayStr && !e.completed;
  }).length;
  document.getElementById("statUpcomingEvents").textContent = upcomingEventsCount;
  document.getElementById("statFlashcardsGenerated").textContent = state.flashcards.length;

  // 5. Render Upcoming Study Backlog
  const recentTaskList = document.getElementById("dashboardRecentTasks");
  const pendingTasks = state.tasks.filter(t => t.status !== "completed");
  document.getElementById("dashPendingCount").textContent = `${pendingTasks.length} Pending`;

  if (recentTaskList) {
    if (pendingTasks.length === 0) {
      recentTaskList.innerHTML = '<p class="text-xs text-slate-400 py-6 text-center">All task backlog items completed!</p>';
    } else {
      recentTaskList.innerHTML = pendingTasks.slice(0, 4).map(t => {
        let isOverdue = t.due_date && t.due_date < todayStr;
        let pColor = "bg-slate-100 text-slate-600";
        if (t.priority === "high") pColor = "bg-rose-50 text-rose-600 border border-rose-100";
        if (t.priority === "medium") pColor = "bg-amber-50 text-amber-600 border border-amber-100";

        return `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border ${isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100'} rounded-xl hover:border-slate-200 transition-colors">
            <div class="truncate pr-2">
              <span class="text-xs font-semibold text-slate-700 truncate block">${t.title || t.text}</span>
              <span class="text-[10px] text-slate-400 font-medium">Due: ${t.due_date || 'No date'}</span>
            </div>
            <div class="flex items-center space-x-1.5 flex-shrink-0">
              ${isOverdue ? '<span class="text-[8px] font-black uppercase text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">Overdue</span>' : ''}
              <span class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${pColor}">${t.priority}</span>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 6. Draw Dashboard Line Chart
  renderDashboardChart();
}

function renderDashboardStudyRecommendation() {
  const recTopicTag = document.getElementById("recTopicTag");
  const recMasteryTag = document.getElementById("recMasteryTag");
  const recTitle = document.getElementById("recTitle");
  const recSubtitle = document.getElementById("recSubtitle");

  // Check if there is an upcoming exam or deadline in next 5 days
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingUrgent = state.calendarEvents.find(e => {
    const d = e.event_date || e.date;
    return d && d >= todayStr && (e.category === "Exams" || e.category === "Assignments" || e.category === "Deadlines") && !e.completed;
  });

  if (upcomingUrgent) {
    recTopicTag.textContent = upcomingUrgent.category || "Exam";
    recTopicTag.className = "text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded";
    recMasteryTag.textContent = `Due: ${upcomingUrgent.event_date || upcomingUrgent.date}`;
    recTitle.textContent = upcomingUrgent.title || upcomingUrgent.text;
    recSubtitle.textContent = upcomingUrgent.description || "Review notes and flashcards for this upcoming academic deadline.";
    return;
  }

  // Otherwise recommend lowest mastery deck
  if (state.decks.length > 0) {
    const sortedDecks = [...state.decks].sort((a, b) => (a.mastery_pct || 0) - (b.mastery_pct || 0));
    const lowestDeck = sortedDecks[0];

    recTopicTag.textContent = "Flashcard Deck";
    recTopicTag.className = "text-[9px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded";
    recMasteryTag.textContent = `Mastery: ${lowestDeck.mastery_pct || 0}%`;
    recTitle.textContent = lowestDeck.title;
    recSubtitle.textContent = `Focus on active recall: ${lowestDeck.known_cards || 0}/${lowestDeck.total_cards || 0} cards mastered.`;
    return;
  }

  // Default fallback
  recTopicTag.textContent = "Focus Mode";
  recTopicTag.className = "text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded";
  recMasteryTag.textContent = "Recommended";
  recTitle.textContent = "Start 25-Minute Study Block";
  recSubtitle.textContent = "Trigger a cognitive Pomodoro timer to build your daily study momentum.";
}

function renderDashboardChart() {
  const canvas = document.getElementById("dashboardPerformanceChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (state.charts.dashboard) state.charts.dashboard.destroy();

  const labels = state.analytics?.charts?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const studyData = state.analytics?.charts?.study_minutes || [0, 0, 0, 0, 0, 0, 0];
  const tasksData = state.analytics?.charts?.tasks_completed || [0, 0, 0, 0, 0, 0, 0];

  state.charts.dashboard = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Study Minutes",
          data: studyData,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.06)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          yAxisID: "y"
        },
        {
          label: "Tasks Completed",
          data: tasksData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          type: "bar",
          borderRadius: 6,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { font: { family: "Plus Jakarta Sans", size: 10, weight: "bold" }, boxWidth: 10 }
        }
      },
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Minutes", font: { size: 9, weight: "bold" } },
          grid: { color: "#f1f5f9" },
          ticks: { font: { size: 10, family: "Plus Jakarta Sans" } }
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Tasks", font: { size: 9, weight: "bold" } },
          grid: { display: false },
          ticks: { stepSize: 1, font: { size: 10, family: "Plus Jakarta Sans" } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, family: "Plus Jakarta Sans" } }
        }
      }
    }
  });
}

// ==================== KANBAN TASK BACKLOG ====================

let taskFilterState = {
  search: "",
  category: "All",
  priority: "All",
  sort: "created_at_desc"
};

function handleTaskFilterChange() {
  taskFilterState.search = document.getElementById("taskSearchInput")?.value || "";
  taskFilterState.category = document.getElementById("taskFilterCategory")?.value || "All";
  taskFilterState.priority = document.getElementById("taskFilterPriority")?.value || "All";
  taskFilterState.sort = document.getElementById("taskSortOrder")?.value || "created_at_desc";
  renderTasks();
}

function renderTasks() {
  const columns = {
    todo: document.getElementById("tasks-col-todo"),
    inprogress: document.getElementById("tasks-col-progress"),
    completed: document.getElementById("tasks-col-completed")
  };

  const counts = {
    todo: document.getElementById("count-todo"),
    inprogress: document.getElementById("count-progress"),
    completed: document.getElementById("count-completed")
  };

  Object.keys(columns).forEach(k => {
    if (columns[k]) columns[k].innerHTML = "";
  });

  const cardsCount = { todo: 0, inprogress: 0, completed: 0 };
  const todayStr = new Date().toISOString().split("T")[0];

  // Filter tasks
  let filtered = state.tasks.filter(t => {
    const textToMatch = `${t.title || t.text} ${t.description || ''}`.toLowerCase();
    const matchesSearch = textToMatch.includes(taskFilterState.search.toLowerCase());
    const matchesCat = taskFilterState.category === "All" || t.category === taskFilterState.category;
    const matchesPri = taskFilterState.priority === "All" || t.priority === taskFilterState.priority;
    return matchesSearch && matchesCat && matchesPri;
  });

  // Sort tasks
  filtered.sort((a, b) => {
    if (taskFilterState.sort === "due_date_asc") {
      return (a.due_date || "9999").localeCompare(b.due_date || "9999");
    }
    if (taskFilterState.sort === "priority") {
      const pMap = { high: 1, medium: 2, low: 3 };
      return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
    }
    if (taskFilterState.sort === "title") {
      return (a.title || a.text || "").localeCompare(b.title || b.text || "");
    }
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  filtered.forEach(t => {
    const status = t.status || "todo";
    const parent = columns[status];
    if (!parent) return;

    cardsCount[status]++;

    const isOverdue = t.due_date && t.due_date < todayStr && status !== "completed";

    let priorityStyle = "bg-slate-100 text-slate-600";
    if (t.priority === "high") priorityStyle = "bg-rose-50 border border-rose-100 text-rose-600";
    if (t.priority === "medium") priorityStyle = "bg-amber-50 border border-amber-100 text-amber-600";
    if (t.priority === "low") priorityStyle = "bg-blue-50 border border-blue-100 text-blue-500";

    const card = document.createElement("div");
    card.className = `bg-white p-4 rounded-xl border ${isOverdue ? 'border-rose-300 shadow-sm overdue-badge' : 'border-slate-200/90'} shadow-sm cursor-grab hover:shadow-md transition-all group flex flex-col justify-between`;
    card.draggable = true;
    card.dataset.id = t.id;
    card.setAttribute("ondragstart", "drag(event)");
    card.setAttribute("ondragend", "dragEnd(event)");

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[9px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${t.category || "General"}</span>
          <div class="flex items-center space-x-1.5">
            ${isOverdue ? '<span class="text-[8px] font-black uppercase text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">Overdue</span>' : ''}
            <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${priorityStyle}">${t.priority || "medium"}</span>
          </div>
        </div>
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1 break-words">${t.title || t.text}</h4>
        ${t.description ? `<p class="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">${t.description}</p>` : '<div class="mb-3"></div>'}
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 pt-2.5">
        <span class="text-[10px] text-slate-400 flex items-center font-semibold">
          <i data-lucide="calendar" class="w-3 h-3 mr-1"></i>
          ${t.due_date ? t.due_date.split('-').slice(1).join('/') : '--/--'}
        </span>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="toggleTaskComplete('${t.id}')" class="p-1 rounded bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors" title="${t.status === 'completed' ? 'Mark Incomplete' : 'Mark Completed'}">
            <i data-lucide="${t.status === 'completed' ? 'rotate-ccw' : 'check'}" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="openEditTaskModal('${t.id}')" class="p-1 rounded bg-slate-50 hover:bg-amber-50 hover:text-amber-600 text-slate-400 transition-colors" title="Edit task">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteTaskItem('${t.id}')" class="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Delete task">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    parent.appendChild(card);
  });

  Object.keys(counts).forEach(k => {
    if (counts[k]) counts[k].textContent = cardsCount[k];
  });

  lucide.createIcons();
}

// Drag & Drop
function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.dataset.id);
  ev.target.classList.add("opacity-40");
}

function dragEnd(ev) {
  ev.target.classList.remove("opacity-40");
  document.querySelectorAll("[data-column]").forEach(col => col.classList.remove("drag-over"));
}

function allowDrop(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add("drag-over");
}

function dragLeave(ev) {
  ev.currentTarget.classList.remove("drag-over");
}

async function drop(ev) {
  ev.preventDefault();
  const columnEl = ev.currentTarget;
  columnEl.classList.remove("drag-over");

  const taskId = ev.dataTransfer.getData("text/plain");
  const destColumn = columnEl.dataset.column;

  const task = state.tasks.find(t => String(t.id) === String(taskId));
  if (task && task.status !== destColumn) {
    task.status = destColumn;
    task.completed = (destColumn === "completed");
    renderTasks();

    const res = await apiRequest(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ status: destColumn })
    });

    if (res.success) {
      showToast(`Task moved to ${destColumn === 'completed' ? 'Finished' : (destColumn === 'inprogress' ? 'In Progress' : 'Planned')}`, "success");
      // Refresh background analytics
      refreshAnalyticsInBackground();
    } else {
      showToast("Failed to sync task status.", "error");
    }
  }
}

async function toggleTaskComplete(taskId) {
  const task = state.tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;

  const nextStatus = task.status === "completed" ? "todo" : "completed";
  task.status = nextStatus;
  task.completed = (nextStatus === "completed");
  renderTasks();
  if (state.activeTab === "dashboard") renderDashboard();

  await apiRequest(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({ status: nextStatus })
  });

  showToast(nextStatus === "completed" ? "Task marked complete!" : "Task returned to Planned backlog", "success");
  refreshAnalyticsInBackground();
}

function openAddTaskModal() {
  document.getElementById("taskFormId").value = "";
  document.getElementById("taskFormInput").value = "";
  document.getElementById("taskFormDescription").value = "";
  document.getElementById("taskFormCategory").value = "Study";
  document.getElementById("taskFormPriority").value = "medium";
  document.getElementById("taskFormDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("taskModalLabel").textContent = "Create Backlog Item";
  document.getElementById("taskFormModal").classList.remove("hidden");
}

function openEditTaskModal(id) {
  const task = state.tasks.find(t => String(t.id) === String(id));
  if (!task) return;

  document.getElementById("taskFormId").value = task.id;
  document.getElementById("taskFormInput").value = task.title || task.text || "";
  document.getElementById("taskFormDescription").value = task.description || "";
  document.getElementById("taskFormCategory").value = task.category || "Study";
  document.getElementById("taskFormPriority").value = task.priority || "medium";
  document.getElementById("taskFormDate").value = task.due_date || "";
  document.getElementById("taskModalLabel").textContent = "Modify Backlog Item";
  document.getElementById("taskFormModal").classList.remove("hidden");
}

function closeAddTaskModal() {
  document.getElementById("taskFormModal").classList.add("hidden");
}

async function saveTaskSubmit() {
  const id = document.getElementById("taskFormId").value.trim();
  const title = document.getElementById("taskFormInput").value.trim();
  const description = document.getElementById("taskFormDescription").value.trim();
  const category = document.getElementById("taskFormCategory").value;
  const priority = document.getElementById("taskFormPriority").value;
  const due_date = document.getElementById("taskFormDate").value;

  if (!title) {
    showToast("Please enter a task title.", "error");
    return;
  }

  closeAddTaskModal();

  if (id) {
    // Update existing task
    const res = await apiRequest(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, description, category, priority, due_date })
    });
    if (res.success && res.data) {
      const idx = state.tasks.findIndex(t => String(t.id) === String(id));
      if (idx !== -1) state.tasks[idx] = res.data;
      showToast("Task updated successfully!", "success");
    }
  } else {
    // Create new task
    const res = await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, description, category, priority, due_date, status: "todo" })
    });
    if (res.success && res.data) {
      state.tasks.unshift(res.data);
      showToast("New task created!", "success");
    }
  }

  renderTasks();
  if (state.activeTab === "dashboard") renderDashboard();
  refreshAnalyticsInBackground();
}

async function deleteTaskItem(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;

  state.tasks = state.tasks.filter(t => String(t.id) !== String(id));
  renderTasks();
  if (state.activeTab === "dashboard") renderDashboard();

  await apiRequest(`/tasks/${id}`, { method: "DELETE" });
  showToast("Task removed.", "info");
  refreshAnalyticsInBackground();
}

// Backward-compatible addTask for prompt/tests
async function addTask() {
  openAddTaskModal();
}

// ==================== ACADEMIC CALENDAR ====================

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

function changeCalendarMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  } else if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  initCalendarGrid();
}

function initCalendarGrid() {
  const container = document.getElementById("calendarDaysGrid");
  if (!container) return;
  container.innerHTML = "";

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  document.getElementById("calendarMonthName").textContent = `${monthsList[calendarMonth]} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();

  // Previous month padding cells
  for (let i = firstDay; i > 0; i--) {
    const day = prevMonthTotalDays - i + 1;
    const box = document.createElement("div");
    box.className = "min-h-[90px] border border-slate-100 p-2 bg-slate-50/40 text-slate-300 text-xs font-semibold select-none";
    box.innerHTML = `<span>${day}</span>`;
    container.appendChild(box);
  }

  const today = new Date();

  // Active month cells
  for (let d = 1; d <= totalDays; d++) {
    const currentDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === d;

    const dayEvents = state.calendarEvents.filter(ce => {
      const evtDate = ce.event_date || ce.date;
      return evtDate === currentDateStr;
    });

    const box = document.createElement("div");
    box.className = `min-h-[90px] border border-slate-100 p-2 hover:bg-slate-50 transition-all cursor-pointer flex flex-col justify-between group ${isToday ? 'bg-blue-50/40 border-blue-200' : 'bg-white'}`;
    box.onclick = (e) => {
      if (e.target.closest("button")) return;
      openAddEventPrompt(currentDateStr);
    };

    let eventsHtml = "";
    if (dayEvents.length > 0) {
      eventsHtml = dayEvents.map(evt => {
        let catStyle = "bg-blue-50 text-blue-700 border-blue-100";
        if (evt.category === "Exams") catStyle = "bg-rose-50 text-rose-700 border-rose-100";
        else if (evt.category === "Assignments") catStyle = "bg-amber-50 text-amber-700 border-amber-100";
        else if (evt.category === "Deadlines") catStyle = "bg-purple-50 text-purple-700 border-purple-100";
        else if (evt.category === "Study") catStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";

        const textVal = evt.title || evt.text;
        const isDone = evt.completed;

        return `
          <div class="text-[9px] px-1.5 py-0.5 rounded flex items-center justify-between font-bold border shadow-xs truncate ${isDone ? 'line-through bg-slate-100 text-slate-400 border-slate-200' : catStyle}" title="${textVal}">
            <span class="truncate pr-1">${textVal}</span>
            <button onclick="toggleCalendarEvent('${evt.id}', event)" class="opacity-0 group-hover:opacity-100 hover:text-emerald-600 transition-opacity">
              <i data-lucide="check" class="w-2.5 h-2.5"></i>
            </button>
          </div>
        `;
      }).join("");
    }

    box.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-bold ${isToday ? 'text-white bg-blue-600 w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-600'}">${d}</span>
        <span class="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 font-extrabold">+ Add</span>
      </div>
      <div class="flex-1 overflow-y-auto space-y-1 custom-scrollbar max-h-16 pr-0.5">
        ${eventsHtml}
      </div>
    `;

    container.appendChild(box);
  }

  // Next month padding cells
  const cellBlocks = firstDay + totalDays;
  const nextMonthDigits = (7 - (cellBlocks % 7)) % 7;
  for (let i = 1; i <= nextMonthDigits; i++) {
    const box = document.createElement("div");
    box.className = "min-h-[90px] border border-slate-100 p-2 bg-slate-50/40 text-slate-300 text-xs font-semibold select-none";
    box.innerHTML = `<span>${i}</span>`;
    container.appendChild(box);
  }

  renderCalendarEventsList();
  lucide.createIcons();
}

function renderCalendarEventsList() {
  const container = document.getElementById("calendarEventsPanelList");
  const countBadge = document.getElementById("calendarEventsCount");
  if (!container) return;

  if (countBadge) countBadge.textContent = state.calendarEvents.length;

  if (state.calendarEvents.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-xs text-slate-400 font-medium">No scheduled events on record.</div>';
    return;
  }

  // Sort upcoming events by date
  const sorted = [...state.calendarEvents].sort((a, b) => {
    const da = a.event_date || a.date || "";
    const db = b.event_date || b.date || "";
    return da.localeCompare(db);
  });

  container.innerHTML = sorted.map(evt => {
    const d = evt.event_date || evt.date || "No date";
    const title = evt.title || evt.text;
    const cat = evt.category || "Classes";
    const isDone = evt.completed;

    let catBadge = "bg-blue-50 text-blue-700";
    if (cat === "Exams") catBadge = "bg-rose-50 text-rose-700";
    else if (cat === "Assignments") catBadge = "bg-amber-50 text-amber-700";
    else if (cat === "Deadlines") catBadge = "bg-purple-50 text-purple-700";
    else if (cat === "Study") catBadge = "bg-emerald-50 text-emerald-700";

    return `
      <div class="p-3 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 transition-all flex items-center justify-between group shadow-card">
        <div class="min-w-0 flex-1 pr-2">
          <div class="flex items-center space-x-2 mb-1">
            <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${d}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${catBadge}">${cat}</span>
            <span class="text-[9px] font-bold text-slate-400">${evt.start_time || '09:00'} - ${evt.end_time || '10:00'}</span>
          </div>
          <p class="text-xs font-bold text-slate-800 truncate ${isDone ? 'line-through text-slate-400' : ''}">${title}</p>
          ${evt.description ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">${evt.description}</p>` : ''}
        </div>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onclick="toggleCalendarEvent('${evt.id}', event)" class="p-1 rounded bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors" title="Toggle Done">
            <i data-lucide="${isDone ? 'rotate-ccw' : 'check-circle'}" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteCalendarEventItem('${evt.id}', event)" class="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Delete Event">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function openAddEventPrompt(defaultDateStr = "") {
  document.getElementById("calEventId").value = "";
  document.getElementById("calEventTextInput").value = "";
  document.getElementById("calEventDescription").value = "";
  document.getElementById("calEventDateInput").value = defaultDateStr || new Date().toISOString().split("T")[0];
  document.getElementById("calEventStartTime").value = "09:00";
  document.getElementById("calEventEndTime").value = "10:00";
  document.getElementById("calEventCategorySelect").value = "Classes";
  document.getElementById("calModalLabel").textContent = "Add Academic Event";
  document.getElementById("calEventModal").classList.remove("hidden");
}

function closeCalEventModal() {
  document.getElementById("calEventModal").classList.add("hidden");
}

async function saveCalEventSubmit() {
  const id = document.getElementById("calEventId").value.trim();
  const title = document.getElementById("calEventTextInput").value.trim();
  const description = document.getElementById("calEventDescription").value.trim();
  const event_date = document.getElementById("calEventDateInput").value;
  const start_time = document.getElementById("calEventStartTime").value;
  const end_time = document.getElementById("calEventEndTime").value;
  const category = document.getElementById("calEventCategorySelect").value;

  if (!title || !event_date) {
    showToast("Please provide event title and date.", "error");
    return;
  }

  closeCalEventModal();

  if (id) {
    const res = await apiRequest(`/calendar/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, description, event_date, start_time, end_time, category })
    });
    if (res.success && res.data) {
      const idx = state.calendarEvents.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) state.calendarEvents[idx] = res.data;
      showToast("Event updated successfully!", "success");
    }
  } else {
    const res = await apiRequest("/calendar", {
      method: "POST",
      body: JSON.stringify({ title, description, event_date, start_time, end_time, category })
    });
    if (res.success && res.data) {
      state.calendarEvents.push(res.data);
      showToast("Academic event scheduled!", "success");
    }
  }

  initCalendarGrid();
  if (state.activeTab === "dashboard") renderDashboard();
}

async function toggleCalendarEvent(id, event) {
  if (event) event.stopPropagation();
  const evt = state.calendarEvents.find(c => String(c.id) === String(id));
  if (!evt) return;

  evt.completed = !evt.completed;
  initCalendarGrid();

  await apiRequest(`/calendar/${id}/toggle`, { method: "POST" });
  showToast(evt.completed ? "Event marked completed!" : "Event marked pending", "info");
}

async function deleteCalendarEventItem(id, event) {
  if (event) event.stopPropagation();
  if (!confirm("Are you sure you want to remove this academic event?")) return;

  state.calendarEvents = state.calendarEvents.filter(c => String(c.id) !== String(id));
  initCalendarGrid();
  if (state.activeTab === "dashboard") renderDashboard();

  await apiRequest(`/calendar/${id}`, { method: "DELETE" });
  showToast("Event deleted.", "info");
}

// ==================== POMODORO FOCUS SYSTEM ====================

function renderPomodoroFocus() {
  updatePomodoroDisplay();
  updateTimerCircularRing();

  const todayMinutes = state.analytics?.overview?.today_study_minutes || state.pomodoro.todayFocusMinutes;
  const weeklyMinutes = state.analytics?.overview?.weekly_study_minutes || state.pomodoro.weeklyFocusMinutes;
  const streak = state.analytics?.overview?.current_streak || state.pomodoro.currentStreak;
  const sessions = state.analytics?.overview?.sessions_today || state.pomodoro.sessionsCompleted;

  document.getElementById("pomoTodayMinutes").textContent = `${todayMinutes}m`;
  document.getElementById("pomoWeeklyMinutes").textContent = `${weeklyMinutes}m`;
  document.getElementById("pomodoroSessionsGoal").textContent = sessions;
  document.getElementById("pomoStreakBadge").querySelector("span").textContent = `${streak} Days`;
}

function updatePomodoroDisplay() {
  const mins = String(state.pomodoro.minutes).padStart(2, "0");
  const secs = String(state.pomodoro.seconds).padStart(2, "0");
  document.getElementById("pomodoroTimerText").textContent = `${mins}:${secs}`;
}

function updateTimerCircularRing() {
  const ring = document.getElementById("pomodoroTimerRing");
  if (!ring) return;

  const circumference = 628; // 2 * pi * 100
  const remainingInSecs = state.pomodoro.minutes * 60 + state.pomodoro.seconds;
  const percentage = remainingInSecs / state.pomodoro.totalTime;

  const offset = circumference * (1 - percentage);
  ring.style.strokeDashoffset = offset;
}

function switchPomodoroMode(mode) {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.isRunning = false;
  }

  state.pomodoro.mode = mode;
  const focusBtn = document.getElementById("pomoModeFocus");
  const shortBtn = document.getElementById("pomoModeShort");
  const longBtn = document.getElementById("pomoModeLong");
  const modeLabel = document.getElementById("pomodoroModeLabel");

  const activeBtnClass = "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all bg-white text-blue-600 shadow-sm";
  const inactiveBtnClass = "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800";

  focusBtn.className = inactiveBtnClass;
  shortBtn.className = inactiveBtnClass;
  longBtn.className = inactiveBtnClass;

  if (mode === "focus") {
    focusBtn.className = activeBtnClass;
    setPomodoroDuration(25);
    modeLabel.textContent = "Focus Mode";
    modeLabel.className = "text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-2";
  } else if (mode === "short_break") {
    shortBtn.className = activeBtnClass;
    setPomodoroDuration(5);
    modeLabel.textContent = "Short Break";
    modeLabel.className = "text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-2";
  } else if (mode === "long_break") {
    longBtn.className = activeBtnClass;
    setPomodoroDuration(15);
    modeLabel.textContent = "Long Break";
    modeLabel.className = "text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-2";
  }

  const toggleBtn = document.getElementById("pomodoroToggleAction");
  toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1.5"></i> <span>Start Timer</span>';
  lucide.createIcons();
}

function setPomodoroDuration(minutes) {
  state.pomodoro.minutes = minutes;
  state.pomodoro.seconds = 0;
  state.pomodoro.totalTime = minutes * 60;
  updatePomodoroDisplay();
  updateTimerCircularRing();
}

function setCustomDuration(minutes) {
  setPomodoroDuration(minutes);
  const toggleBtn = document.getElementById("pomodoroToggleAction");
  toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1.5"></i> <span>Start Focus</span>';
  lucide.createIcons();
}

function toggleTimerRun() {
  const toggleBtn = document.getElementById("pomodoroToggleAction");

  if (state.pomodoro.isRunning) {
    // Pause
    clearInterval(state.pomodoro.interval);
    state.pomodoro.isRunning = false;
    toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1.5"></i> <span>Resume</span>';
    showToast("Timer paused.", "info");
  } else {
    // Start
    state.pomodoro.isRunning = true;
    toggleBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4 mr-1.5"></i> <span>Pause</span>';

    state.pomodoro.interval = setInterval(async () => {
      if (state.pomodoro.seconds === 0) {
        if (state.pomodoro.minutes === 0) {
          // Timer finished
          clearInterval(state.pomodoro.interval);
          state.pomodoro.isRunning = false;
          toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1.5"></i> <span>Start</span>';

          const finishedMinutes = Math.round(state.pomodoro.totalTime / 60);

          if (state.pomodoro.mode === "focus") {
            state.pomodoro.sessionsCompleted++;
            state.pomodoro.todayFocusMinutes += finishedMinutes;

            const topicVal = document.getElementById("pomodoroTopicInput")?.value || "General Study";

            // Save study session to database
            await apiRequest("/sessions", {
              method: "POST",
              body: JSON.stringify({
                duration_minutes: finishedMinutes,
                session_type: "focus",
                topic: topicVal
              })
            });

            showToast(`Focus block completed! Logged ${finishedMinutes}m to database.`, "success");
            switchPomodoroMode("short_break");
            refreshAnalyticsInBackground();
          } else {
            showToast("Break finished! Ready to begin another focus block.", "info");
            switchPomodoroMode("focus");
          }
        } else {
          state.pomodoro.minutes--;
          state.pomodoro.seconds = 59;
          updatePomodoroDisplay();
          updateTimerCircularRing();
        }
      } else {
        state.pomodoro.seconds--;
        updatePomodoroDisplay();
        updateTimerCircularRing();
      }
    }, 1000);
  }

  lucide.createIcons();
}

function resetTimerCount() {
  if (state.pomodoro.interval) clearInterval(state.pomodoro.interval);
  state.pomodoro.isRunning = false;
  switchPomodoroMode(state.pomodoro.mode);
}

function quickStartPomodoro() {
  showTab("pomodoro");
  if (!state.pomodoro.isRunning) {
    toggleTimerRun();
  }
}

// ==================== FLASHCARDS & STUDY DECKS ====================

let flashcardSearchQuery = "";
let flashcardDifficultyFilterVal = "All";
let flashcardTopicFilterVal = "All";
let activeDeckFilter = null;

function renderFlashcardsTab() {
  renderDecksGrid();
  renderFlashcardBadges();
  renderFlashcardGrid();
}

function populateTargetDeckSelects() {
  const selectors = [
    document.getElementById("flashcardTargetDeckSelect"),
    document.getElementById("manualCardDeckSelect"),
    document.getElementById("aiReviewDeckSelect")
  ];

  selectors.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">No Deck (General)</option>' +
      state.decks.map(d => `<option value="${d.id}">${d.title}</option>`).join("");
    if (currentVal) sel.value = currentVal;
  });
}

function renderDecksGrid() {
  const container = document.getElementById("flashcardDecksContainer");
  const countBadge = document.getElementById("decksCountBadge");
  if (!container) return;

  if (countBadge) countBadge.textContent = `${state.decks.length} Deck${state.decks.length === 1 ? '' : 's'}`;

  if (state.decks.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border-2 border-dashed border-slate-200/90 rounded-2xl p-6 text-center text-slate-400">
        <i data-lucide="folder-plus" class="w-6 h-6 mx-auto mb-1 text-slate-300"></i>
        <span class="text-xs font-bold block">No decks created yet.</span>
        <button onclick="openCreateDeckModal()" class="mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">+ Create Deck</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = state.decks.map(deck => {
    const isSelected = activeDeckFilter === deck.id;
    return `
      <div class="p-4 rounded-2xl border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200 bg-white'} shadow-card hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="w-3 h-3 rounded-full" style="background-color: ${deck.color || '#2563eb'}"></span>
            <span class="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${deck.mastery_pct || 0}% Mastered</span>
          </div>
          <h4 class="text-xs font-extrabold text-slate-800 truncate">${deck.title}</h4>
          <p class="text-[11px] text-slate-400 truncate mt-0.5">${deck.description || `${deck.total_cards || 0} cards`}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button onclick="filterByDeck(${deck.id})" class="text-[11px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}">
            ${isSelected ? 'Viewing' : 'View Cards'}
          </button>
          <button onclick="launchStudyMode(${deck.id})" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1 shadow-sm">
            <i data-lucide="play" class="w-2.5 h-2.5"></i>
            <span>Study</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function filterByDeck(deckId) {
  if (activeDeckFilter === deckId) {
    activeDeckFilter = null; // Toggle off
  } else {
    activeDeckFilter = deckId;
  }
  renderDecksGrid();
  renderFlashcardGrid();
}

function renderFlashcardBadges() {
  const container = document.getElementById("flashcardsCategoryFiltersPanel");
  if (!container) return;

  const topics = ["All", ...new Set(state.flashcards.map(c => c.topic || c.category || "General"))];

  container.innerHTML = topics.map(t => {
    const count = t === "All" ? state.flashcards.length : state.flashcards.filter(c => (c.topic || c.category) === t).length;
    const active = flashcardTopicFilterVal === t;
    return `
      <button onclick="setFlashcardTopicFilter('${t}')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
      }">
        ${t} <span class="ml-1 opacity-70 text-[10px]">${count}</span>
      </button>
    `;
  }).join("");
}

function setFlashcardTopicFilter(topic) {
  flashcardTopicFilterVal = topic;
  renderFlashcardBadges();
  renderFlashcardGrid();
}

function filterFlashcardsByDifficulty(diff) {
  flashcardDifficultyFilterVal = diff;
  renderFlashcardGrid();
}

function searchFlashcards() {
  flashcardSearchQuery = document.getElementById("flashcardsSearchInput")?.value || "";
  renderFlashcardGrid();
}

function renderFlashcardGrid() {
  const container = document.getElementById("flashcardsContainerGrid");
  if (!container) return;

  const filtered = state.flashcards.filter(card => {
    const textMatch = card.question.toLowerCase().includes(flashcardSearchQuery.toLowerCase()) ||
                      card.answer.toLowerCase().includes(flashcardSearchQuery.toLowerCase());
    const topicMatch = flashcardTopicFilterVal === "All" || (card.topic || card.category) === flashcardTopicFilterVal;
    const diffMatch = flashcardDifficultyFilterVal === "All" || card.difficulty === flashcardDifficultyFilterVal;
    const deckMatch = activeDeckFilter === null || card.deck_id === activeDeckFilter;

    return textMatch && topicMatch && diffMatch && deckMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400 font-medium">
        <i data-lucide="help-circle" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        No flashcards matched your query. Generate new cards or create one above!
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(card => {
    let diffColor = "bg-slate-100 text-slate-600";
    if (card.difficulty === "Easy") diffColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
    if (card.difficulty === "Hard") diffColor = "bg-rose-50 text-rose-700 border border-rose-100";

    return `
      <div class="perspective-1000 w-full h-48 cursor-pointer relative group" onclick="flipCardElement(this)">
        <div class="card-inner w-full h-full relative transform-style-3d transition-transform duration-500 ease-out select-none">
          <!-- FRONT FACE -->
          <div class="backface-hidden absolute inset-0 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-card hover:border-blue-200 transition-all">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-wider">${card.topic || card.category || 'General'}</span>
                <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${diffColor}">${card.difficulty || 'Medium'}</span>
              </div>
              <p class="text-xs font-bold text-slate-800 mt-3 line-clamp-3 leading-relaxed">${card.question}</p>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-semibold">
              <span class="flex items-center"><i data-lucide="rotate-3d" class="w-3.5 h-3.5 mr-1 text-blue-500"></i> Click to flip</span>
              <div class="flex items-center space-x-1" onclick="event.stopPropagation()">
                <button onclick="toggleCardMastery('${card.id}', event)" class="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="${card.is_known ? 'Mark Difficult' : 'Mark Known'}">
                  <i data-lucide="${card.is_known ? 'check-circle-2' : 'circle'}" class="w-3.5 h-3.5 ${card.is_known ? 'text-emerald-500' : ''}"></i>
                </button>
                <button onclick="deleteFlashcardItem('${card.id}', event)" class="p-1 rounded hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Delete card">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          </div>
          <!-- BACK FACE -->
          <div class="backface-hidden rotate-y-180 absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 border border-blue-700/60 rounded-2xl p-5 flex flex-col justify-between shadow-md text-white">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded uppercase tracking-wider">Answer Key</span>
                <span class="text-[9px] font-bold ${card.is_known ? 'text-emerald-300' : 'text-amber-200'}">${card.is_known ? 'Mastered' : 'Needs Review'}</span>
              </div>
              <p class="text-xs font-semibold mt-3 text-white line-clamp-4 leading-relaxed">${card.answer}</p>
            </div>
            <div class="text-[10px] text-white/70 border-t border-white/15 pt-2 font-semibold flex items-center justify-between">
              <span>Click to flip front</span>
              <span class="text-[9px] text-white/50">${card.source || 'manual'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function flipCardElement(wrapper) {
  const inner = wrapper.querySelector(".card-inner");
  if (inner) inner.classList.toggle("card-flipped");
}

async function toggleCardMastery(cardId, event) {
  if (event) event.stopPropagation();
  const card = state.flashcards.find(c => String(c.id) === String(cardId));
  if (!card) return;

  const nextState = !card.is_known;
  card.is_known = nextState;
  renderFlashcardGrid();

  await apiRequest(`/flashcards/${cardId}/review`, {
    method: "POST",
    body: JSON.stringify({ is_known: nextState })
  });

  // Reload decks to update mastery stats
  const decksRes = await apiRequest("/flashcards/decks");
  if (decksRes.success) state.decks = decksRes.data || [];
  renderDecksGrid();
}

async function deleteFlashcardItem(id, event) {
  if (event) event.stopPropagation();
  if (!confirm("Delete this study flashcard?")) return;

  state.flashcards = state.flashcards.filter(c => String(c.id) !== String(id));
  renderFlashcardGrid();
  renderDecksGrid();
  if (state.activeTab === "dashboard") renderDashboard();

  await apiRequest(`/flashcards/${id}`, { method: "DELETE" });
  showToast("Flashcard deleted.", "info");
}

// AI Flashcard Generation with Pre-Save Review Modal
async function generateFlashcard() {
  const topicInput = document.getElementById("flashcardTopicInput");
  const materialInput = document.getElementById("flashcardInputText");
  const deckSelect = document.getElementById("flashcardTargetDeckSelect");

  const topic = topicInput ? topicInput.value.trim() : "General";
  const textMaterial = materialInput ? materialInput.value.trim() : "";
  const selectedDeckId = deckSelect ? deckSelect.value : "";

  if (!textMaterial) {
    showToast("Please enter lecture notes or study material first.", "error");
    return;
  }

  const submitBtn = document.getElementById("flashcardGenSubmitBtn");
  const originalText = submitBtn.innerHTML;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-1.5 animate-spin"></i> Synthesizing...';
  lucide.createIcons();

  const res = await apiRequest("/flashcards/generate", {
    method: "POST",
    body: JSON.stringify({
      topic,
      text: textMaterial,
      count: 5
    })
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = originalText;
  lucide.createIcons();

  if (res.success && res.data && res.data.cards) {
    state.aiReview.cards = res.data.cards;
    state.aiReview.source = res.data.source;
    state.aiReview.sourceLabel = res.data.source_label || "AI Generated";
    openAiReviewModal(selectedDeckId);
  } else {
    showToast(res.error || "Failed to generate flashcards.", "error");
  }
}

function openAiReviewModal(preselectedDeckId = "") {
  const modal = document.getElementById("aiReviewModal");
  const badge = document.getElementById("aiReviewSourceBadge");
  const list = document.getElementById("aiReviewCardsList");
  const countText = document.getElementById("aiReviewCountText");
  const deckSelect = document.getElementById("aiReviewDeckSelect");

  if (badge) {
    badge.textContent = state.aiReview.sourceLabel;
    badge.className = state.aiReview.source === "ai"
      ? "text-[9px] uppercase font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full"
      : "text-[9px] uppercase font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full";
  }

  if (deckSelect && preselectedDeckId) {
    deckSelect.value = preselectedDeckId;
  }

  renderAiReviewCards();
  modal.classList.remove("hidden");
  lucide.createIcons();
}

function closeAiReviewModal() {
  document.getElementById("aiReviewModal").classList.add("hidden");
}

function renderAiReviewCards() {
  const list = document.getElementById("aiReviewCardsList");
  const countText = document.getElementById("aiReviewCountText");
  if (!list) return;

  if (countText) countText.textContent = `${state.aiReview.cards.length} card(s) to save`;

  list.innerHTML = state.aiReview.cards.map((card, idx) => {
    return `
      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Card #${idx + 1}</span>
          <button onclick="removeAiReviewCard(${idx})" class="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors" title="Discard this card">
            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
          </button>
        </div>
        <div>
          <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Question</label>
          <input type="text" oninput="updateAiReviewCard(${idx}, 'question', this.value)" value="${escapeHtml(card.question)}" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Answer</label>
          <textarea rows="2" oninput="updateAiReviewCard(${idx}, 'answer', this.value)" class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-blue-500">${escapeHtml(card.answer)}</textarea>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function updateAiReviewCard(idx, field, value) {
  if (state.aiReview.cards[idx]) {
    state.aiReview.cards[idx][field] = value;
  }
}

function removeAiReviewCard(idx) {
  state.aiReview.cards.splice(idx, 1);
  renderAiReviewCards();
}

async function saveAiReviewedCards() {
  const targetDeckId = document.getElementById("aiReviewDeckSelect")?.value || null;
  const cardsToSave = state.aiReview.cards.map(c => ({
    ...c,
    deck_id: targetDeckId
  }));

  if (cardsToSave.length === 0) {
    showToast("No cards to save.", "info");
    closeAiReviewModal();
    return;
  }

  const res = await apiRequest("/flashcards", {
    method: "POST",
    body: JSON.stringify({ cards: cardsToSave })
  });

  if (res.success && res.data) {
    state.flashcards.unshift(...res.data);
    showToast(`Saved ${res.data.length} flashcards to your collection!`, "success");
    closeAiReviewModal();

    // Clear inputs
    const materialInput = document.getElementById("flashcardInputText");
    if (materialInput) materialInput.value = "";

    // Refresh decks
    const decksRes = await apiRequest("/flashcards/decks");
    if (decksRes.success) state.decks = decksRes.data || [];

    renderFlashcardsTab();
    if (state.activeTab === "dashboard") renderDashboard();
  } else {
    showToast(res.error || "Failed to save flashcards.", "error");
  }
}

// Manual Deck & Card Creation
function openCreateDeckModal() {
  document.getElementById("deckTitleInput").value = "";
  document.getElementById("deckDescInput").value = "";
  document.getElementById("createDeckModal").classList.remove("hidden");
}

function closeCreateDeckModal() {
  document.getElementById("createDeckModal").classList.add("hidden");
}

async function saveDeckSubmit() {
  const title = document.getElementById("deckTitleInput").value.trim();
  const description = document.getElementById("deckDescInput").value.trim();
  const color = document.querySelector('input[name="deckColor"]:checked')?.value || "#2563eb";

  if (!title) {
    showToast("Please enter a deck title.", "error");
    return;
  }

  closeCreateDeckModal();

  const res = await apiRequest("/flashcards/decks", {
    method: "POST",
    body: JSON.stringify({ title, description, color })
  });

  if (res.success && res.data) {
    state.decks.push(res.data);
    populateTargetDeckSelects();
    renderDecksGrid();
    showToast("Study deck created!", "success");
  } else {
    showToast(res.error || "Failed to create deck.", "error");
  }
}

function openCreateCardModal() {
  document.getElementById("manualCardId").value = "";
  document.getElementById("manualCardQuestion").value = "";
  document.getElementById("manualCardAnswer").value = "";
  document.getElementById("manualCardTopic").value = "";
  document.getElementById("manualCardDifficulty").value = "Medium";
  document.getElementById("createCardModal").classList.remove("hidden");
}

function closeCreateCardModal() {
  document.getElementById("createCardModal").classList.add("hidden");
}

async function saveManualCardSubmit() {
  const question = document.getElementById("manualCardQuestion").value.trim();
  const answer = document.getElementById("manualCardAnswer").value.trim();
  const topic = document.getElementById("manualCardTopic").value.trim() || "General";
  const difficulty = document.getElementById("manualCardDifficulty").value;
  const deck_id = document.getElementById("manualCardDeckSelect").value || null;

  if (!question || !answer) {
    showToast("Please provide both question and answer.", "error");
    return;
  }

  closeCreateCardModal();

  const res = await apiRequest("/flashcards", {
    method: "POST",
    body: JSON.stringify({ question, answer, topic, difficulty, deck_id, source: "manual" })
  });

  if (res.success && res.data) {
    const newCards = Array.isArray(res.data) ? res.data : [res.data];
    state.flashcards.unshift(...newCards);
    showToast("Flashcard saved!", "success");

    const decksRes = await apiRequest("/flashcards/decks");
    if (decksRes.success) state.decks = decksRes.data || [];

    renderFlashcardsTab();
  } else {
    showToast(res.error || "Failed to save flashcard.", "error");
  }
}

// ==================== DEDICATED FLASHCARD STUDY MODE ====================

function startStudyModeForFirstDeck() {
  if (state.decks.length > 0) {
    launchStudyMode(state.decks[0].id);
  } else if (state.flashcards.length > 0) {
    launchStudyMode(null); // study all
  } else {
    showToast("No flashcards found. Create or generate some cards first!", "info");
    showTab("flashcard");
  }
}

function launchStudyMode(deckId = null) {
  let cards = [];
  let title = "All Flashcards";

  if (deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    title = deck ? deck.title : "Study Deck";
    cards = state.flashcards.filter(c => c.deck_id === deckId);
  } else {
    cards = [...state.flashcards];
  }

  if (cards.length === 0) {
    showToast("No cards in this deck to study. Add some cards first!", "info");
    return;
  }

  state.studyMode.isActive = true;
  state.studyMode.deckId = deckId;
  state.studyMode.deckTitle = title;
  state.studyMode.cards = cards;
  state.studyMode.currentIndex = 0;
  state.studyMode.isFlipped = false;
  state.studyMode.reviewedCount = 0;
  state.studyMode.knownCount = cards.filter(c => c.is_known).length;

  document.getElementById("studyDeckTitle").textContent = title;
  document.getElementById("studyModeModal").classList.remove("hidden");
  renderStudyCard();
}

function exitStudyMode() {
  state.studyMode.isActive = false;
  document.getElementById("studyModeModal").classList.add("hidden");
  // Refresh views to show updated mastery
  renderFlashcardsTab();
  if (state.activeTab === "dashboard") renderDashboard();
}

function renderStudyCard() {
  const card = state.studyMode.cards[state.studyMode.currentIndex];
  if (!card) return;

  state.studyMode.isFlipped = false;
  const inner = document.getElementById("studyCardInner");
  if (inner) inner.classList.remove("is-flipped");

  const total = state.studyMode.cards.length;
  const currentNum = state.studyMode.currentIndex + 1;
  const masteryPct = total > 0 ? Math.round((state.studyMode.knownCount / total) * 100) : 0;

  document.getElementById("studyDeckProgressText").textContent = `Card ${currentNum} of ${total} • ${masteryPct}% Mastered`;
  document.getElementById("studyCardTopicBadge").textContent = card.topic || card.category || "Concept";
  document.getElementById("studyCardDifficultyBadge").textContent = card.difficulty || "Medium";
  document.getElementById("studyCardQuestionText").textContent = card.question;
  document.getElementById("studyCardAnswerText").textContent = card.answer;

  const stateBadge = document.getElementById("studyCardMasteryStateBadge");
  if (stateBadge) {
    stateBadge.textContent = card.is_known ? "Mastered" : "Needs Practice";
    stateBadge.className = card.is_known
      ? "text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full"
      : "text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-full";
  }

  lucide.createIcons();
}

function toggleStudyCardFlip() {
  state.studyMode.isFlipped = !state.studyMode.isFlipped;
  const inner = document.getElementById("studyCardInner");
  if (inner) inner.classList.toggle("is-flipped", state.studyMode.isFlipped);
}

async function markCardReview(isKnown) {
  const card = state.studyMode.cards[state.studyMode.currentIndex];
  if (!card) return;

  const prevKnown = card.is_known;
  card.is_known = isKnown;
  card.review_count = (card.review_count || 0) + 1;

  if (isKnown && !prevKnown) state.studyMode.knownCount++;
  else if (!isKnown && prevKnown) state.studyMode.knownCount = Math.max(0, state.studyMode.knownCount - 1);

  // Sync to database
  await apiRequest(`/flashcards/${card.id}/review`, {
    method: "POST",
    body: JSON.stringify({ is_known: isKnown })
  });

  studyNavNext();
}

function studyNavNext() {
  if (state.studyMode.currentIndex < state.studyMode.cards.length - 1) {
    state.studyMode.currentIndex++;
    renderStudyCard();
  } else {
    // Finished deck
    const masteryPct = Math.round((state.studyMode.knownCount / state.studyMode.cards.length) * 100);
    showToast(`Deck complete! You achieved ${masteryPct}% mastery.`, "success");
    exitStudyMode();
  }
}

function studyNavPrev() {
  if (state.studyMode.currentIndex > 0) {
    state.studyMode.currentIndex--;
    renderStudyCard();
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // Global Ctrl+K to search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const searchBox = document.getElementById("globalWorkspaceSearch");
      if (searchBox) searchBox.focus();
      return;
    }

    // Active Study Mode shortcuts
    if (state.studyMode.isActive) {
      if (e.code === "Space") {
        e.preventDefault();
        toggleStudyCardFlip();
      } else if (e.code === "ArrowRight") {
        studyNavNext();
      } else if (e.code === "ArrowLeft") {
        studyNavPrev();
      } else if (e.key === "1") {
        markCardReview(false);
      } else if (e.key === "2") {
        markCardReview(true);
      } else if (e.code === "Escape") {
        exitStudyMode();
      }
    }
  });
}

function handleGlobalSearch(query) {
  if (!query) return;
  // If in tasks, filter tasks; if in flashcards, filter cards
  if (state.activeTab === "todo") {
    taskFilterState.search = query;
    renderTasks();
  } else if (state.activeTab === "flashcard") {
    flashcardSearchQuery = query;
    renderFlashcardGrid();
  }
}

// ==================== PRODUCTIVITY ANALYTICS VIEW ====================

async function refreshAnalyticsView() {
  const res = await apiRequest("/analytics");
  if (res.success && res.data) {
    state.analytics = res.data;
    renderAnalyticsView();
    showToast("Analytics refreshed.", "info");
  }
}

async function refreshAnalyticsInBackground() {
  const res = await apiRequest("/analytics");
  if (res.success && res.data) {
    state.analytics = res.data;
  }
}

function renderAnalyticsView() {
  if (!state.analytics) return;

  const data = state.analytics;
  const labels = data.charts?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const tasksDone = data.charts?.tasks_completed || [0, 0, 0, 0, 0, 0, 0];
  const studyHours = data.charts?.study_hours || [0, 0, 0, 0, 0, 0, 0];
  const distribution = data.charts?.task_distribution || { todo: 0, inprogress: 0, completed: 0 };
  const categories = data.charts?.category_distribution || {};

  // Badge
  const badge = document.getElementById("analyticsCompletionPctBadge");
  if (badge) badge.textContent = `${data.overview?.completion_rate || 0}% Done`;

  // Chart 1: Tasks Completed Per Day (Bar)
  const ctx1 = document.getElementById("chartTasksPerDay")?.getContext("2d");
  if (ctx1) {
    if (state.charts.tasksPerDay) state.charts.tasksPerDay.destroy();
    state.charts.tasksPerDay = new Chart(ctx1, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Tasks Completed",
          data: tasksDone,
          backgroundColor: "#10b981",
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 2: Daily Study Hours (Area Line)
  const ctx2 = document.getElementById("chartStudyHours")?.getContext("2d");
  if (ctx2) {
    if (state.charts.studyHours) state.charts.studyHours.destroy();
    state.charts.studyHours = new Chart(ctx2, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Study Hours",
          data: studyHours,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#2563eb",
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Hours", font: { size: 9, weight: "bold" } } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 3: Task Status Breakdown (Donut)
  const ctx3 = document.getElementById("chartTaskStatusDonut")?.getContext("2d");
  if (ctx3) {
    if (state.charts.taskStatusDonut) state.charts.taskStatusDonut.destroy();
    const hasTasks = (distribution.todo + distribution.inprogress + distribution.completed) > 0;

    state.charts.taskStatusDonut = new Chart(ctx3, {
      type: "doughnut",
      data: {
        labels: ["To Do", "In Progress", "Completed"],
        datasets: [{
          data: hasTasks ? [distribution.todo, distribution.inprogress, distribution.completed] : [1, 0, 0],
          backgroundColor: hasTasks ? ["#94a3b8", "#f59e0b", "#10b981"] : ["#e2e8f0", "#e2e8f0", "#e2e8f0"],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 10, weight: "bold" }, boxWidth: 10 } }
        }
      }
    });
  }

  // Chart 4: Academic Activity by Category (Bar)
  const ctx4 = document.getElementById("chartCategoryBar")?.getContext("2d");
  if (ctx4) {
    if (state.charts.categoryBar) state.charts.categoryBar.destroy();
    const catLabels = Object.keys(categories);
    const catCounts = Object.values(categories);

    state.charts.categoryBar = new Chart(ctx4, {
      type: "bar",
      data: {
        labels: catLabels.length > 0 ? catLabels : ["No Categories"],
        datasets: [{
          label: "Tasks",
          data: catCounts.length > 0 ? catCounts : [0],
          backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 } },
          y: { grid: { display: false } }
        }
      }
    });
  }
}

// ==================== UTILITY HELPERS ====================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
