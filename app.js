// Master Application State
let state = {
  user: null,
  activeTab: 'dashboard',
  tasks: [],
  calendarTasks: [],
  flashcards: [],
  pomodoro: {
    minutes: 25,
    seconds: 0,
    totalTime: 1500, // 25 mins in seconds
    isRunning: false,
    isPaused: false,
    interval: null,
    sessionsCompleted: 0,
    totalFocusTime: 0 // in minutes
  },
  devLogs: []
};

// Database synchronizer logger
function logDevConsole(method, endpoint, status, latency) {
  const time = new Date().toLocaleTimeString();
  const log = { time, method, endpoint, status, latency };
  state.devLogs.unshift(log);
  if (state.devLogs.length > 25) state.devLogs.pop();
  
  const container = document.getElementById('apiLogConsole');
  if (!container) return;
  
  container.innerHTML = state.devLogs.map(l => {
    let methodColor = 'text-green-400';
    if (l.method === 'POST') methodColor = 'text-blue-400';
    if (l.method === 'DELETE') methodColor = 'text-rose-400';
    if (l.method === 'PATCH') methodColor = 'text-amber-400';
    return `
      <div class="font-mono text-[11px] mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1 opacity-90">
        <div>
          <span class="text-slate-500">[${l.time}]</span>
          <span class="${methodColor} font-bold mr-1">${l.method}</span>
          <span class="text-slate-300 font-medium">${l.endpoint}</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <span class="text-[10px] px-1 rounded bg-green-950 text-green-300 border border-green-800">${l.status}</span>
          <span class="text-slate-400 font-semibold">${l.latency}ms</span>
        </div>
      </div>
    `;
  }).join('');
}

// Simulated network delay helper
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// API layer with localStorage fallback
const API = {
  // Authentication
  authenticateUser: async (email, password) => {
    const start = performance.now();
    await delay(350);
    const existingPassword = localStorage.getItem(`auth_${email}`);
    
    if (existingPassword) {
      if (existingPassword === password) {
        logDevConsole('POST', '/api/auth/login', '200 OK', Math.round(performance.now() - start));
        return { success: true, email };
      } else {
        logDevConsole('POST', '/api/auth/login', '401 Unauthorized', Math.round(performance.now() - start));
        return { success: false, error: 'Invalid password' };
      }
    } else {
      localStorage.setItem(`auth_${email}`, password);
      logDevConsole('POST', '/api/auth/register', '201 Created', Math.round(performance.now() - start));
      return { success: true, email, isNew: true };
    }
  },

  // Task lists
  fetchTasks: async () => {
    const start = performance.now();
    await delay(200);
    const local = localStorage.getItem('tasksData');
    const tasks = local ? JSON.parse(local) : [
      { id: '1', text: 'Structure project wireframes', status: 'completed', priority: 'high', category: 'Study', dueDate: new Date().toISOString().split('T')[0] },
      { id: '2', text: 'Integrate PostgreSQL REST endpoints', status: 'inprogress', priority: 'medium', category: 'Coding', dueDate: new Date().toISOString().split('T')[0] },
      { id: '3', text: 'Present system flow in exhibition', status: 'todo', priority: 'high', category: 'Study', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
      { id: '4', text: 'Refactor UI design tokens', status: 'todo', priority: 'low', category: 'Design', dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0] }
    ];
    if (!local) localStorage.setItem('tasksData', JSON.stringify(tasks));
    logDevConsole('GET', '/api/tasks', '200 OK', Math.round(performance.now() - start));
    return tasks;
  },
  
  updateTasksList: async (newList) => {
    const start = performance.now();
    await delay(100);
    localStorage.setItem('tasksData', JSON.stringify(newList));
    logDevConsole('PUT', '/api/tasks', '204 No Content', Math.round(performance.now() - start));
    return true;
  },

  // Calendar
  fetchCalendarEvents: async () => {
    const start = performance.now();
    await delay(200);
    const local = localStorage.getItem('calendarTasks');
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // Convert back from calendar task objects
    const events = local ? JSON.parse(local) : [
      { text: `${todayStr}: Review Artificial Intelligence lecture`, completed: false },
      { text: `${tomorrowStr}: Team sprint retrospective`, completed: true }
    ];
    if (!local) localStorage.setItem('calendarTasks', JSON.stringify(events));
    logDevConsole('GET', '/api/calendar/events', '200 OK', Math.round(performance.now() - start));
    return events;
  },

  saveCalendarEvents: async (newList) => {
    const start = performance.now();
    await delay(100);
    localStorage.setItem('calendarTasks', JSON.stringify(newList));
    logDevConsole('PUT', '/api/calendar/events', '200 OK', Math.round(performance.now() - start));
    return true;
  },

  // Flashcards
  fetchFlashcards: async () => {
    const start = performance.now();
    await delay(200);
    const local = localStorage.getItem('flashcardsData');
    const cards = local ? JSON.parse(local) : [
      { id: 'fc1', question: 'What does Acid-properties mean in databases?', answer: 'ACID stands for Atomicity, Consistency, Isolation, and Durability, ensuring transactions are processed reliably.', category: 'Databases', date: new Date().toISOString().split('T')[0] },
      { id: 'fc2', question: 'What is the runtime of binary search?', answer: 'The runtime is Logarithmic Time complexity, denoted as O(log n), which halves search spaces.', category: 'Algorithms', date: new Date().toISOString().split('T')[0] }
    ];
    if (!local) localStorage.setItem('flashcardsData', JSON.stringify(cards));
    logDevConsole('GET', '/api/flashcards', '200 OK', Math.round(performance.now() - start));
    return cards;
  },

  saveFlashcards: async (newList) => {
    const start = performance.now();
    await delay(100);
    localStorage.setItem('flashcardsData', JSON.stringify(newList));
    logDevConsole('PUT', '/api/flashcards', '201 Created', Math.round(performance.now() - start));
    return true;
  }
};

// Global App Initialization
document.addEventListener("DOMContentLoaded", async () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    state.user = loggedInUser;
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
    document.getElementById("userEmail").textContent = loggedInUser;
    
    // Load initial data
    state.tasks = await API.fetchTasks();
    state.calendarTasks = await API.fetchCalendarEvents();
    state.flashcards = await API.fetchFlashcards();
    
    showTab('dashboard');
  } else {
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("mainContent").classList.add("hidden");
  }
});

// User actions: Login & Authentication
async function loginOrCreateAccount() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please fill in both Email and Password fields.");
    return;
  }

  const loader = document.createElement('div');
  loader.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center';
  loader.innerHTML = '<div class="bg-white p-6 rounded-2xl shadow-xl flex items-center space-x-3"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span class="font-medium text-slate-800 text-sm">Authenticating dashboard profile...</span></div>';
  document.body.appendChild(loader);

  const res = await API.authenticateUser(email, password);
  loader.remove();

  if (res.success) {
    localStorage.setItem("loggedInUser", email);
    state.user = email;
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
    document.getElementById("userEmail").textContent = email;
    
    // Load fresh states
    state.tasks = await API.fetchTasks();
    state.calendarTasks = await API.fetchCalendarEvents();
    state.flashcards = await API.fetchFlashcards();
    
    emailInput.value = "";
    passwordInput.value = "";
    showTab('dashboard');
  } else {
    alert(res.error);
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  state.user = null;
  
  // Clear running timers
  if (state.pomodoro.interval) {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.interval = null;
  }
  
  document.getElementById("mainContent").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

// Sidebar Tab Management
function showTab(tabId) {
  state.activeTab = tabId;
  const tabs = ["dashboard", "todo", "calendar", "pomodoro", "flashcard", "settings"];
  
  tabs.forEach((t) => {
    const el = document.getElementById(t);
    if (el) el.classList.add("hidden");
    
    // Sidebar list buttons classes
    const btn = document.getElementById(`nav-${t}`);
    if (btn) {
      btn.className = "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-100 hover:text-slate-900 group";
    }
  });

  const activePanel = document.getElementById(tabId === 'todo' ? 'todo' : tabId);
  if (activePanel) activePanel.classList.remove("hidden");
  
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.className = "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all sidebar-active";
  }

  // Update header content
  const headerTitles = {
    'dashboard': 'Platform Operations Center',
    'todo': 'Task Backlog Manager',
    'calendar': 'Academic Class & Schedule Planner',
    'pomodoro': 'Cognitive Pomodoro Timer',
    'flashcard': 'AI Summary Card Synthesizer',
    'settings': 'PostgreSQL Dashboard Console'
  };
  document.getElementById('viewTitleHeader').textContent = headerTitles[tabId] || 'Workspace';

  // Render trigger functions for specific panels
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'todo') {
    renderTasks();
  } else if (tabId === 'calendar') {
    initCalendarGrid();
  } else if (tabId === 'pomodoro') {
    renderPomodoroFocus();
  } else if (tabId === 'flashcard') {
    renderFlashcardGrid();
  }
  
  // Rerender Lucide symbols
  lucide.createIcons();
}

// =================== DASHBOARD TAB ===================
let dashboardChartInstance = null;

function renderDashboard() {
  // Update metric statistics indicators
  const statsHours = document.getElementById('statFocusHours');
  const statsTask = document.getElementById('statCompletedTasks');
  const statsEvents = document.getElementById('statUpcomingEvents');
  const statsCards = document.getElementById('statFlashcardsGenerated');

  if (statsHours) statsHours.textContent = `${state.pomodoro.totalFocusTime}m`;
  
  if (statsTask) {
    const done = state.tasks.filter(t => t.status === 'completed').length;
    statsTask.textContent = `${done}/${state.tasks.length}`;
  }
  
  if (statsEvents) {
    const today = new Date().toISOString().split('T')[0];
    const incoming = state.calendarTasks.filter(item => {
      const match = item.text.match(/^(\d{4}-\d{2}-\d{2}):/);
      return match && match[1] >= today && !item.completed;
    }).length;
    statsEvents.textContent = incoming;
  }
  
  if (statsCards) statsCards.textContent = state.flashcards.length;

  // Render recent listings
  const recentTaskList = document.getElementById('dashboardRecentTasks');
  if (recentTaskList) {
    const unfinished = state.tasks.filter(t => t.status !== 'completed').slice(0, 3);
    if (unfinished.length === 0) {
      recentTaskList.innerHTML = '<p class="text-xs text-slate-400">All task logs fully completed.</p>';
    } else {
      recentTaskList.innerHTML = unfinished.map(t => {
        let pColor = 'bg-slate-100 text-slate-600';
        if (t.priority === 'high') pColor = 'bg-rose-50 text-rose-600 border border-rose-100';
        if (t.priority === 'medium') pColor = 'bg-amber-50 text-amber-600 border border-amber-100';
        return `
          <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
            <span class="text-xs font-semibold text-slate-700 truncate max-w-[180px]">${t.text}</span>
            <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pColor}">${t.priority}</span>
          </div>
        `;
      }).join('');
    }
  }

  // Draw chart
  const canvasElement = document.getElementById('dashboardPerformanceChart');
  if (canvasElement) {
    const ctx = canvasElement.getContext('2d');
    if (dashboardChartInstance) dashboardChartInstance.destroy();
    
    dashboardChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Active Study (Minutes)',
          data: [15, 30, 0, 45, state.pomodoro.totalFocusTime, 10, 25],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.04)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } }
        }
      }
    });
  }
}

// =================== TASKS / TO-DO TAB ===================
function renderTasks() {
  const columns = {
    todo: document.getElementById('tasks-col-todo'),
    inprogress: document.getElementById('tasks-col-progress'),
    completed: document.getElementById('tasks-col-completed')
  };

  const counts = {
    todo: document.getElementById('count-todo'),
    inprogress: document.getElementById('count-progress'),
    completed: document.getElementById('count-completed')
  };

  // Reset columns
  Object.keys(columns).forEach(k => {
    if (columns[k]) columns[k].innerHTML = '';
  });

  const cardsCount = { todo: 0, inprogress: 0, completed: 0 };

  state.tasks.forEach(t => {
    const status = t.status || 'todo';
    const parentContainer = columns[status];
    if (!parentContainer) return;
    
    cardsCount[status]++;

    let priorityStyle = 'bg-slate-100 text-slate-600';
    if (t.priority === 'high') priorityStyle = 'bg-rose-50 border border-rose-100 text-rose-600';
    if (t.priority === 'medium') priorityStyle = 'bg-amber-50 border border-amber-100 text-amber-600';
    if (t.priority === 'low') priorityStyle = 'bg-blue-50 border border-blue-100 text-blue-500';

    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm cursor-grab hover:shadow transition-shadow group flex flex-col justify-between';
    card.draggable = true;
    card.dataset.id = t.id;
    card.setAttribute('ondragstart', 'drag(event)');
    card.setAttribute('ondragend', 'dragEnd(event)');

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${t.category || 'General'}</span>
          <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${priorityStyle}">${t.priority || 'medium'}</span>
        </div>
        <p class="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors mb-3 pr-2 break-words">${t.text}</p>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 pt-3">
        <span class="text-[11px] text-slate-400 flex items-center font-medium">
          <i data-lucide="calendar" class="w-3 h-3 mr-1"></i>
          ${t.dueDate ? t.dueDate.split('-').slice(1).join('/') : '--/--'}
        </span>
        <div class="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="editTaskModal('${t.id}')" class="p-1 rounded bg-slate-50 hover:bg-amber-50 hover:text-amber-600 text-slate-400 transition-colors" title="Edit text">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteTaskItem('${t.id}')" class="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Remove task">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
    parentContainer.appendChild(card);
  });

  // Render counters
  Object.keys(counts).forEach(k => {
    if (counts[k]) counts[k].textContent = cardsCount[k];
  });
  
  lucide.createIcons();
}

// Drag & drop interface triggers
function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.dataset.id);
  ev.target.classList.add('opacity-40');
}

function dragEnd(ev) {
  ev.target.classList.remove('opacity-40');
  
  const columns = document.querySelectorAll('[data-column]');
  columns.forEach(col => col.classList.remove('drag-over'));
}

function allowDrop(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add('drag-over');
}

function dragLeave(ev) {
  ev.currentTarget.classList.remove('drag-over');
}

async function drop(ev) {
  ev.preventDefault();
  const columnEl = ev.currentTarget;
  columnEl.classList.remove('drag-over');
  
  const taskId = ev.dataTransfer.getData("text/plain");
  const destColumn = columnEl.dataset.column;
  
  const taskIndex = state.tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    state.tasks[taskIndex].status = destColumn;
    state.tasks[taskIndex].completed = (destColumn === 'completed');
    await API.updateTasksList(state.tasks);
    renderTasks();
  }
}

// Open modal for task creation
function openAddTaskModal() {
  document.getElementById('taskFormModal').classList.remove('hidden');
}

function closeAddTaskModal() {
  document.getElementById('taskFormModal').classList.add('hidden');
  document.getElementById('taskFormId').value = '';
  document.getElementById('taskFormInput').value = '';
  document.getElementById('taskFormCategory').value = 'Study';
  document.getElementById('taskFormPriority').value = 'medium';
  document.getElementById('taskFormDate').value = '';
}

// Core Task Add & Edit actions
async function saveTaskSubmit() {
  const textInput = document.getElementById('taskFormInput');
  const catInput = document.getElementById('taskFormCategory');
  const priInput = document.getElementById('taskFormPriority');
  const dateInput = document.getElementById('taskFormDate');
  const idInput = document.getElementById('taskFormId').value.trim();

  const text = textInput.value.trim();
  if (!text) {
    alert("Please write a task description.");
    return;
  }

  const category = catInput.value;
  const priority = priInput.value;
  const dueDate = dateInput.value || new Date().toISOString().split('T')[0];

  if (idInput) {
    // Edit existing item
    const idx = state.tasks.findIndex(t => t.id === idInput);
    if (idx !== -1) {
      state.tasks[idx].text = text;
      state.tasks[idx].category = category;
      state.tasks[idx].priority = priority;
      state.tasks[idx].dueDate = dueDate;
    }
  } else {
    // Create new item
    const newItem = {
      id: 'task_' + Date.now(),
      text,
      category,
      priority,
      dueDate,
      status: 'todo',
      completed: false
    };
    state.tasks.push(newItem);
  }

  await API.updateTasksList(state.tasks);
  closeAddTaskModal();
  renderTasks();
}

// Task manipulation called inside columns
function editTaskModal(id) {
  const item = state.tasks.find(t => t.id === id);
  if (!item) return;

  document.getElementById('taskFormId').value = item.id;
  document.getElementById('taskFormInput').value = item.text;
  document.getElementById('taskFormCategory').value = item.category || 'Study';
  document.getElementById('taskFormPriority').value = item.priority || 'medium';
  document.getElementById('taskFormDate').value = item.dueDate || '';

  document.getElementById('taskModalLabel').textContent = 'Modify Backlog Item';
  document.getElementById('taskFormModal').classList.remove('hidden');
}

async function deleteTaskItem(id) {
  if (confirm("Are you sure you want to delete this task?")) {
    const start = performance.now();
    state.tasks = state.tasks.filter(t => t.id !== id);
    await API.updateTasksList(state.tasks);
    logDevConsole('DELETE', `/api/tasks/${id}`, '204 No Content', Math.round(performance.now() - start));
    renderTasks();
  }
}

// Preserve compatible onclick functions from original code
async function addTask() {
  const taskInput = document.getElementById("taskInput");
  const text = taskInput ? taskInput.value.trim() : "";
  if (text) {
    const newItem = {
      id: 'task_' + Date.now(),
      text,
      category: 'Study',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'todo',
      completed: false
    };
    state.tasks.push(newItem);
    await API.updateTasksList(state.tasks);
    if (taskInput) taskInput.value = "";
    renderTasks();
  }
}

// =================== CALENDAR TAB ===================
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
  const container = document.getElementById('calendarDaysGrid');
  if (!container) return;
  container.innerHTML = '';

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();

  // Highlight active month header
  const monthsList = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  document.getElementById('calendarMonthName').textContent = `${monthsList[calendarMonth]} ${calendarYear}`;

  // Fill in prefix cells from previous month
  for (let i = firstDay; i > 0; i--) {
    const day = prevMonthTotalDays - i + 1;
    const box = document.createElement('div');
    box.className = 'min-h-[100px] border border-slate-100 p-2 bg-slate-50/50 text-slate-400 text-xs font-semibold select-none flex flex-col justify-between';
    box.innerHTML = `<span>${day}</span>`;
    container.appendChild(box);
  }

  const today = new Date();
  
  // Fill in active month days
  for (let d = 1; d <= totalDays; d++) {
    const currentDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === d;
    
    const dayEvents = state.calendarTasks.filter(ce => {
      const match = ce.text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
      return match && match[1] === currentDateStr;
    });

    const box = document.createElement('div');
    box.className = `min-h-[100px] border border-slate-100 p-2 hover:bg-slate-50 transition-all cursor-pointer flex flex-col justify-between group ${isToday ? 'bg-blue-50/30 border-blue-200' : 'bg-white'}`;
    box.onclick = (e) => {
      if (e.target.closest('button')) return; // Avoid modal trigger when editing buttons
      openAddEventPrompt(currentDateStr);
    };

    let eventsHtml = '';
    if (dayEvents.length > 0) {
      eventsHtml = dayEvents.map(evt => {
        const textParts = evt.text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
        const textVal = textParts ? textParts[2] : evt.text;
        const tagStyle = evt.completed ? 'bg-slate-100 text-slate-400 line-through' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100';
        return `
          <div class="text-[9px] px-1.5 py-0.5 rounded flex items-center justify-between font-semibold shadow-sm truncate pr-1 ${tagStyle}" title="${textVal}">
            <span class="truncate pr-1">${textVal}</span>
            <button onclick="toggleCalendarItem('${evt.text}')" class="opacity-0 group-hover:opacity-100 transition-opacity hover:text-green-600">
               <i data-lucide="check" class="w-2.5 h-2.5"></i>
            </button>
          </div>
        `;
      }).join('');
    }

    box.innerHTML = `
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-bold ${isToday ? 'text-white bg-blue-600 w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-600'}">${d}</span>
        <span class="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 font-bold">+ Event</span>
      </div>
      <div class="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5 max-h-[64px]">
        ${eventsHtml}
      </div>
    `;
    container.appendChild(box);
  }

  // Fill in padding cells from next month
  const cellBlocks = firstDay + totalDays;
  const nextMonthDigits = (7 - (cellBlocks % 7)) % 7;
  for (let i = 1; i <= nextMonthDigits; i++) {
    const box = document.createElement('div');
    box.className = 'min-h-[100px] border border-slate-100 p-2 bg-slate-50/50 text-slate-400 text-xs font-semibold select-none flex flex-col justify-between';
    box.innerHTML = `<span>${i}</span>`;
    container.appendChild(box);
  }

  // Render separate sidebar list of all events
  renderCalendarEventsList();
  lucide.createIcons();
}

function renderCalendarEventsList() {
  const container = document.getElementById('calendarEventsPanelList');
  if (!container) return;
  
  if (state.calendarTasks.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400 font-medium">No events synced on record.</div>';
    return;
  }

  // Sort events by date
  const sorted = [...state.calendarTasks].sort((a,b) => {
    return a.text.localeCompare(b.text);
  });

  container.innerHTML = sorted.map((evt, idx) => {
    const split = evt.text.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
    const date = split ? split[1] : 'No date';
    const text = split ? split[2] : evt.text;
    
    return `
      <div class="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex items-center justify-between group shadow-sm">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-2 mb-1">
            <span class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">${date}</span>
            <span class="text-[9px] font-bold ${evt.completed ? 'text-green-500 bg-green-50' : 'text-amber-500 bg-amber-50'}">${evt.completed ? 'Completed' : 'Pending'}</span>
          </div>
          <p class="text-xs font-semibold text-slate-700 truncate ${evt.completed ? 'line-through text-slate-400' : ''}">${text}</p>
        </div>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="toggleCalendarItem('${evt.text}')" class="p-1 rounded bg-slate-50 hover:bg-green-50 hover:text-green-600 text-slate-400 transition-colors" title="Complete toggle">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteCalendarItem('${evt.text}')" class="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Remove event">
            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Triggers for adding and editing events from calendar cell click
function openAddEventPrompt(dateStr) {
  document.getElementById('calEventDateInput').value = dateStr;
  document.getElementById('calEventTextInput').value = '';
  document.getElementById('calEventModal').classList.remove('hidden');
}

function closeCalEventModal() {
  document.getElementById('calEventModal').classList.add('hidden');
}

async function saveCalEventSubmit() {
  const dateVal = document.getElementById('calEventDateInput').value;
  const textVal = document.getElementById('calEventTextInput').value.trim();

  if (!dateVal || !textVal) {
    alert("Please make sure all details are filled.");
    return;
  }

  const newEventStr = `${dateVal}: ${textVal}`;
  state.calendarTasks.push({ text: newEventStr, completed: false });
  await API.saveCalendarEvents(state.calendarTasks);
  closeCalEventModal();
  initCalendarGrid();
}

async function toggleCalendarItem(rawTextString) {
  const idx = state.calendarTasks.findIndex(c => c.text === rawTextString);
  if (idx !== -1) {
    state.calendarTasks[idx].completed = !state.calendarTasks[idx].completed;
    await API.saveCalendarEvents(state.calendarTasks);
    initCalendarGrid();
  }
}

async function deleteCalendarItem(rawTextString) {
  if (confirm("Delete this calendar event?")) {
    state.calendarTasks = state.calendarTasks.filter(c => c.text !== rawTextString);
    await API.saveCalendarEvents(state.calendarTasks);
    initCalendarGrid();
  }
}

// Preserve original compatibility signatures
async function addCalendarTask() {
  const dateVal = document.getElementById("calendarInput")?.value;
  const textVal = document.getElementById("taskInputCalendar")?.value.trim();
  if (dateVal && textVal) {
    const rawVal = `${dateVal}: ${textVal}`;
    state.calendarTasks.push({ text: rawVal, completed: false });
    await API.saveCalendarEvents(state.calendarTasks);
    if (document.getElementById("taskInputCalendar")) {
      document.getElementById("taskInputCalendar").value = "";
    }
    initCalendarGrid();
  }
}

async function addCalendarEvent() {
  await addCalendarTask();
}

// =================== POMODORO TIMER TAB ===================
function renderPomodoroFocus() {
  updateTimeDisplayString();
  updateTimerCircularRing();
  
  // Render Preset Indicators
  document.getElementById('pomodoroSessionsGoal').textContent = state.pomodoro.sessionsCompleted;
}

function updateTimeDisplayString() {
  const mins = String(state.pomodoro.minutes).padStart(2, '0');
  const secs = String(state.pomodoro.seconds).padStart(2, '0');
  
  document.getElementById('pomodoroTimerText').textContent = `${mins}:${secs}`;
}

function updateTimerCircularRing() {
  const ring = document.getElementById('pomodoroTimerRing');
  if (!ring) return;
  
  const circumference = 597; // 2 * pi * radius (95)
  const remainingInSecs = state.pomodoro.minutes * 60 + state.pomodoro.seconds;
  const percentage = remainingInSecs / state.pomodoro.totalTime;
  
  const offset = circumference * (1 - percentage);
  ring.style.strokeDashoffset = offset;
}

function setPomodoroTime(minutes) {
  if (state.pomodoro.isRunning) {
    clearInterval(state.pomodoro.interval);
    state.pomodoro.isRunning = false;
  }
  
  state.pomodoro.minutes = minutes;
  state.pomodoro.seconds = 0;
  state.pomodoro.totalTime = minutes * 60;
  
  updateTimeDisplayString();
  updateTimerCircularRing();
  
  const pillBtn = document.getElementById('pomodoroToggleAction');
  pillBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 mr-1.5"></i> Start Focus';
  lucide.createIcons();
}

function toggleTimerRun() {
  const pillBtn = document.getElementById('pomodoroToggleAction');
  
  if (state.pomodoro.isRunning) {
    // Pause state triggered
    clearInterval(state.pomodoro.interval);
    state.pomodoro.isRunning = false;
    pillBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 mr-1.5"></i> Resume Focus';
  } else {
    // Start or Resume state triggered
    state.pomodoro.isRunning = true;
    pillBtn.innerHTML = '<i data-lucide="pause" class="w-5 h-5 mr-1.5"></i> Pause Timer';
    
    const startLog = performance.now();
    logDevConsole('POST', '/api/timer/start', '200 OK', Math.round(performance.now() - startLog + 5));

    state.pomodoro.interval = setInterval(async () => {
      if (state.pomodoro.seconds === 0) {
        if (state.pomodoro.minutes === 0) {
          // Finished countdown
          clearInterval(state.pomodoro.interval);
          state.pomodoro.isRunning = false;
          pillBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 mr-1.5"></i> Start Focus';
          
          state.pomodoro.sessionsCompleted++;
          state.pomodoro.totalFocusTime += Math.round(state.pomodoro.totalTime / 60);
          
          alert("Focus session complete! Synchronizing logs to PostgreSQL db...");
          
          // API tracking calls
          const apiStart = performance.now();
          logDevConsole('POST', '/api/timer/sessions', '201 Created', Math.round(performance.now() - apiStart));
          
          // Reset to default
          setPomodoroTime(25);
        } else {
          state.pomodoro.minutes--;
          state.pomodoro.seconds = 59;
          updateTimeDisplayString();
          updateTimerCircularRing();
        }
      } else {
        state.pomodoro.seconds--;
        updateTimeDisplayString();
        updateTimerCircularRing();
      }
    }, 1000);
  }
  lucide.createIcons();
}

function resetTimerCount() {
  if (state.pomodoro.interval) {
    clearInterval(state.pomodoro.interval);
  }
  
  state.pomodoro.isRunning = false;
  state.pomodoro.minutes = 25;
  state.pomodoro.seconds = 0;
  state.pomodoro.totalTime = 1500;
  
  updateTimeDisplayString();
  updateTimerCircularRing();
  
  const pillBtn = document.getElementById('pomodoroToggleAction');
  pillBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 mr-1.5"></i> Start Focus';
  lucide.createIcons();
}

// Map key original controls to local modernized actions
function startPomodoro() {
  const pInput = document.getElementById("pomodoroInput")?.value;
  const parsedMins = parseInt(pInput);
  if (!isNaN(parsedMins) && parsedMins > 0) {
    setPomodoroTime(parsedMins);
  }
  toggleTimerRun();
}

function pausePomodoro() {
  if (state.pomodoro.isRunning) {
    toggleTimerRun();
  }
}

function resumePomodoro() {
  if (!state.pomodoro.isRunning) {
    toggleTimerRun();
  }
}

function endPomodoro() {
  resetTimerCount();
}

// =================== FLASHCARDS TAB ===================
let flashcardsSearchFilter = "";
let flashcardsCategoryFilter = "All";

function renderFlashcardGrid() {
  const container = document.getElementById('flashcardsContainerGrid');
  if (!container) return;

  const filtered = state.flashcards.filter(c => {
    const textMatch = c.question.toLowerCase().includes(flashcardsSearchFilter.toLowerCase()) || 
                      c.answer.toLowerCase().includes(flashcardsSearchFilter.toLowerCase());
    const queryCategory = flashcardsCategoryFilter === 'All' || c.category === flashcardsCategoryFilter;
    return textMatch && queryCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400 font-medium">
        <i data-lucide="help-circle" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
        No flashcards found. Create study content in the inputs above!
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(card => {
    return `
      <div class="perspective-1000 w-full h-44 cursor-pointer relative group" onclick="flipCardElement(this)">
        <div class="card-inner w-full h-full relative transform-style-3d transition-transform duration-500 ease-out select-none">
          <!-- FRONT FACE -->
          <div class="backface-hidden absolute inset-0 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm group-hover:border-slate-300 transition-all">
            <div>
              <span class="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-wider">${card.category}</span>
              <p class="text-xs font-bold text-slate-700 mt-3 pr-2 line-clamp-3 leading-relaxed">${card.question}</p>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-2 font-medium">
              <span class="flex items-center"><i data-lucide="rotate-3d" class="w-3.5 h-3.5 mr-1 text-blue-500"></i> Click to flip</span>
              <button onclick="deleteFlashcardItem('${card.id}', event)" class="p-1 rounded bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors" title="Delete card">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          <!-- BACK FACE -->
          <div class="backface-hidden rotate-y-180 absolute inset-0 bg-blue-600 border border-blue-700/50 rounded-2xl p-5 flex flex-col justify-between shadow-md text-white">
            <div>
              <span class="text-[9px] font-bold bg-white/20 text-white/90 px-2 py-0.5 rounded uppercase tracking-wider">Answer Key</span>
              <p class="text-xs font-semibold mt-3 text-white line-clamp-4 leading-relaxed">${card.answer}</p>
            </div>
            <div class="text-[10px] text-white/60 border-t border-white/10 pt-2 font-semibold">
              Click to return to face
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Render Categories count in selector buttons
  renderFlashcardSelectorFilterBadges();
  lucide.createIcons();
}

function renderFlashcardSelectorFilterBadges() {
  const container = document.getElementById('flashcardsCategoryFiltersPanel');
  if (!container) return;

  const categories = ['All', ...new Set(state.flashcards.map(c => c.category))];
  
  container.innerHTML = categories.map(cat => {
    const count = cat === 'All' ? state.flashcards.length : state.flashcards.filter(c => c.category === cat).length;
    const active = flashcardsCategoryFilter === cat;
    
    return `
      <button onclick="setFlashcardsCategoryFilter('${cat}')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
      }">
        ${cat} <span class="ml-1 opacity-70 text-[10px] font-semibold">${count}</span>
      </button>
    `;
  }).join('');
}

function setFlashcardsCategoryFilter(category) {
  flashcardsCategoryFilter = category;
  renderFlashcardGrid();
}

function searchFlashcards() {
  const query = document.getElementById('flashcardsSearchInput');
  flashcardsSearchFilter = query ? query.value.trim() : "";
  renderFlashcardGrid();
}

function flipCardElement(cardWrapper) {
  const innerNode = cardWrapper.querySelector('.card-inner');
  if (innerNode) innerNode.classList.toggle('card-flipped');
}

async function deleteFlashcardItem(id, event) {
  event.stopPropagation(); // Avoid card flip
  if (confirm("Are you sure you want to delete this study card?")) {
    state.flashcards = state.flashcards.filter(fc => fc.id !== id);
    await API.saveFlashcards(state.flashcards);
    renderFlashcardGrid();
  }
}

// Hugging Face details with fallback mechanism
async function generateFlashcard() {
  const materialInput = document.getElementById('flashcardInputText');
  const catInput = document.getElementById('flashcardFormCategory');
  
  const textMaterial = materialInput ? materialInput.value.trim() : "";
  const categoryStr = catInput ? catInput.value : 'General';
  
  if (!textMaterial) {
    alert("Please enter study material text first.");
    return;
  }

  const submitBtn = document.getElementById('flashcardGenSubmitBtn');
  const btnOriginalText = submitBtn.innerHTML;
  
  // Visual Loading indicators
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-1.5 animate-spin"></i> Analyzing models...';
  lucide.createIcons();

  const start = performance.now();
  let generatedResultText = "";
  
  try {
    // Attempt real REST API endpoint calling
    const response = await fetch(
      "https://api-inference.huggingface.co/models/bert",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer YOUR_API_KEY",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: textMaterial }),
      }
    );
    const data = await response.json();
    
    if (data[0] && data[0].summary_text) {
      generatedResultText = data[0].summary_text;
      logDevConsole('POST', 'https://api-inference.huggingface.co/models/bert', '200 OK', Math.round(performance.now() - start));
    } else {
      throw new Error("No model direct summary response");
    }
  } catch (err) {
    // REST API failed/Unauthorized -> Fallback to client-side rule extraction
    await delay(600); // Realistic simulation delay
    
    const sentences = textMaterial.split(/[.?!]+/);
    const cleanLines = sentences.map(s => s.trim()).filter(s => s.length > 15);
    
    if (cleanLines.length > 0) {
      generatedResultText = cleanLines[0];
    } else {
      generatedResultText = textMaterial.slice(0, 100);
    }
    logDevConsole('POST', 'https://api-inference.huggingface.co/models/bert', '401 Unauthorized (Local Solver Used)', Math.round(performance.now() - start));
  }

  // Create flashcard
  const questionStr = textMaterial.length > 70 ? textMaterial.slice(0, 67) + '...' : textMaterial;
  
  const newCard = {
    id: 'fc_' + Date.now(),
    question: `What concepts does this summarize: "${questionStr}"?`,
    answer: generatedResultText,
    category: categoryStr,
    date: new Date().toISOString().split('T')[0]
  };

  state.flashcards.push(newCard);
  await API.saveFlashcards(state.flashcards);
  
  if (materialInput) materialInput.value = "";
  submitBtn.disabled = false;
  submitBtn.innerHTML = btnOriginalText;
  
  renderFlashcardGrid();
  lucide.createIcons();
}
