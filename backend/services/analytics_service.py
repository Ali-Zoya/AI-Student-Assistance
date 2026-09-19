from datetime import datetime, date, timedelta
from sqlalchemy import func
from ..models import Task, StudySession, CalendarEvent, Flashcard, FlashcardDeck

def get_user_analytics(user_id: int) -> dict:
    today = date.today()
    
    # 1. Last 7 days dates and labels
    days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        days.append(d)
        
    day_labels = [d.strftime("%a") for d in days]
    day_strings = [d.isoformat() for d in days]

    # 2. Daily Study Time (from StudySession)
    # Filter sessions in the last 7 days
    start_date = datetime.combine(days[0], datetime.min.time())
    sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.completed_at >= start_date
    ).all()

    study_minutes_by_day = {d: 0 for d in day_strings}
    for s in sessions:
        if s.completed_at:
            s_date = s.completed_at.date().isoformat()
            if s_date in study_minutes_by_day:
                study_minutes_by_day[s_date] += s.duration_minutes

    study_minutes_list = [study_minutes_by_day[d] for d in day_strings]
    study_hours_list = [round(m / 60, 1) for m in study_minutes_list]

    # 3. Tasks statistics
    user_tasks = Task.query.filter_by(user_id=user_id).all()
    total_tasks = len(user_tasks)
    todo_count = sum(1 for t in user_tasks if t.status == "todo")
    inprogress_count = sum(1 for t in user_tasks if t.status == "inprogress")
    completed_count = sum(1 for t in user_tasks if t.status == "completed")
    
    # Overdue tasks
    today_str = today.isoformat()
    overdue_count = sum(1 for t in user_tasks if t.status != "completed" and t.due_date and t.due_date < today_str)

    # Completed tasks by day (based on updated_at in the last 7 days for completed tasks)
    tasks_done_by_day = {d: 0 for d in day_strings}
    for t in user_tasks:
        if t.status == "completed" and t.updated_at:
            t_date = t.updated_at.date().isoformat()
            if t_date in tasks_done_by_day:
                tasks_done_by_day[t_date] += 1
    tasks_done_list = [tasks_done_by_day[d] for d in day_strings]

    # Tasks by Category
    categories = {}
    for t in user_tasks:
        cat = t.category or "General"
        categories[cat] = categories.get(cat, 0) + 1

    # 4. Pomodoro Metrics & Streaks
    all_sessions = StudySession.query.filter_by(user_id=user_id).all()
    total_focus_minutes = sum(s.duration_minutes for s in all_sessions if s.session_type == "focus")
    today_sessions = [s for s in all_sessions if s.completed_at and s.completed_at.date() == today]
    today_focus_minutes = sum(s.duration_minutes for s in today_sessions if s.session_type == "focus")
    
    # Weekly focus minutes (last 7 days)
    weekly_focus_minutes = sum(study_minutes_list)

    # Streak calculation
    session_dates = {s.completed_at.date() for s in all_sessions if s.completed_at}
    current_streak = 0
    check_day = today
    while check_day in session_dates:
        current_streak += 1
        check_day -= timedelta(days=1)

    # Most productive day of the week
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday_minutes = {i: 0 for i in range(7)}
    for s in all_sessions:
        if s.completed_at and s.session_type == "focus":
            weekday_minutes[s.completed_at.weekday()] += s.duration_minutes
    
    best_weekday_idx = max(weekday_minutes, key=weekday_minutes.get)
    most_productive_day = weekday_names[best_weekday_idx] if weekday_minutes[best_weekday_idx] > 0 else "No data yet"

    # 5. Flashcards metrics
    flashcards = Flashcard.query.filter_by(user_id=user_id).all()
    total_flashcards = len(flashcards)
    known_flashcards = sum(1 for fc in flashcards if fc.is_known)
    flashcard_mastery = round((known_flashcards / total_flashcards * 100)) if total_flashcards > 0 else 0
    decks_count = FlashcardDeck.query.filter_by(user_id=user_id).count()

    # 6. Upcoming calendar events (next 7 days)
    upcoming_events = CalendarEvent.query.filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.event_date >= today_str,
        CalendarEvent.completed == False
    ).order_by(CalendarEvent.event_date.asc(), CalendarEvent.start_time.asc()).limit(5).all()

    # 7. Today's tasks (due today and not completed)
    todays_tasks = [t.to_dict() for t in user_tasks if t.due_date == today_str]

    return {
        "overview": {
            "today_study_minutes": today_focus_minutes,
            "today_study_hours": round(today_focus_minutes / 60, 1),
            "weekly_study_minutes": weekly_focus_minutes,
            "total_focus_minutes": total_focus_minutes,
            "sessions_today": len(today_sessions),
            "total_sessions": len(all_sessions),
            "current_streak": current_streak,
            "most_productive_day": most_productive_day,
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "pending_tasks": todo_count + inprogress_count,
            "overdue_tasks": overdue_count,
            "completion_rate": round((completed_count / total_tasks * 100)) if total_tasks > 0 else 0,
            "total_flashcards": total_flashcards,
            "flashcard_mastery": flashcard_mastery,
            "decks_count": decks_count,
            "upcoming_events_count": len(upcoming_events)
        },
        "charts": {
            "labels": day_labels,
            "dates": day_strings,
            "study_minutes": study_minutes_list,
            "study_hours": study_hours_list,
            "tasks_completed": tasks_done_list,
            "task_distribution": {
                "todo": todo_count,
                "inprogress": inprogress_count,
                "completed": completed_count
            },
            "category_distribution": categories
        },
        "today_agenda": {
            "tasks": todays_tasks,
            "upcoming_events": [e.to_dict() for e in upcoming_events]
        }
    }
