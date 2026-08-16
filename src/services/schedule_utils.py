from datetime import datetime, timezone
from src.models.course import ScheduleConflictDetail


def parse_time_to_minutes(time_str: str) -> int:
    """Parse 'HH:MM' or 'HH:MM:SS' string into minutes from start of day."""
    parts = time_str.strip().split(":")
    hours = int(parts[0])
    minutes = int(parts[1])
    return hours * 60 + minutes


def minutes_to_time_str(mins: int) -> str:
    """Convert minutes from start of day to 'HH:MM' string."""
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"


def parse_datetime(val: datetime | str | None) -> datetime | None:
    """Safely parse a datetime or string into a timezone-aware UTC datetime."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        s = str(val).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def date_ranges_overlap(
    start1: datetime, end1: datetime, start2: datetime, end2: datetime
) -> bool:
    """Return True if two date ranges [start1, end1] and [start2, end2] overlap."""
    # Ensure timezone awareness consistency
    s1 = start1 if start1.tzinfo else start1.replace(tzinfo=timezone.utc)
    e1 = end1 if end1.tzinfo else end1.replace(tzinfo=timezone.utc)
    s2 = start2 if start2.tzinfo else start2.replace(tzinfo=timezone.utc)
    e2 = end2 if end2.tzinfo else end2.replace(tzinfo=timezone.utc)

    return s1 <= e2 and s2 <= e1


def check_schedule_conflict(
    existing_enrolled_courses: list, new_course
) -> ScheduleConflictDetail | None:
    """
    Compare new_course's schedules against existing_enrolled_courses' schedules.
    Returns ScheduleConflictDetail if a conflict is found, otherwise None.
    """
    new_schedules = getattr(new_course, "schedules", [])
    if not new_schedules:
        return None

    new_start = getattr(new_course, "start_date", None)
    new_end = getattr(new_course, "end_date", None)

    for item in existing_enrolled_courses:
        existing_course = item if hasattr(item, "id") else item.get("course")
        if not existing_course:
            continue

        if existing_course.id == getattr(new_course, "id", None):
            continue

        existing_start = getattr(existing_course, "start_date", None)
        existing_end = getattr(existing_course, "end_date", None)

        # Check date range overlap
        if new_start and new_end and existing_start and existing_end:
            if not date_ranges_overlap(new_start, new_end, existing_start, existing_end):
                continue

        existing_schedules = getattr(existing_course, "schedules", [])
        for e_sched in existing_schedules:
            for n_sched in new_schedules:
                # Compare day of week (case-insensitive)
                e_day = e_sched.day_of_week.strip().lower() if hasattr(e_sched, "day_of_week") else n_sched.get("day_of_week", "").strip().lower()
                n_day = n_sched.day_of_week.strip().lower() if hasattr(n_sched, "day_of_week") else n_sched.get("day_of_week", "").strip().lower()

                if e_day == n_day:
                    e_start_mins = parse_time_to_minutes(e_sched.start_time)
                    e_end_mins = parse_time_to_minutes(e_sched.end_time)
                    n_start_mins = parse_time_to_minutes(n_sched.start_time)
                    n_end_mins = parse_time_to_minutes(n_sched.end_time)

                    # Strict interval overlap condition: start1 < end2 and start2 < end1
                    if e_start_mins < n_end_mins and n_start_mins < e_end_mins:
                        ov_start = max(e_start_mins, n_start_mins)
                        ov_end = min(e_end_mins, n_end_mins)

                        return ScheduleConflictDetail(
                            conflicting_course_id=existing_course.id,
                            conflicting_course_code=existing_course.code,
                            conflicting_course_name=existing_course.name,
                            day_of_week=e_sched.day_of_week,
                            existing_start_time=e_sched.start_time,
                            existing_end_time=e_sched.end_time,
                            new_start_time=n_sched.start_time,
                            new_end_time=n_sched.end_time,
                            overlap_start_time=minutes_to_time_str(ov_start),
                            overlap_end_time=minutes_to_time_str(ov_end),
                        )
    return None


def check_task_conflict_with_fixed_schedules(
    scheduled_date: datetime | str,
    start_time: str,
    end_time: str,
    enrolled_courses: list,
) -> dict | None:
    """
    Check if a study session task at `scheduled_date` from `start_time` to `end_time`
    overlaps with any fixed CourseSchedule of the student's enrolled courses.
    Returns details dict if conflict occurs, or None if clear.
    """
    if not scheduled_date or not start_time or not end_time or not enrolled_courses:
        return None

    if isinstance(scheduled_date, str):
        try:
            target_dt = datetime.fromisoformat(scheduled_date.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        target_dt = scheduled_date

    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    target_day_name = weekday_names[target_dt.weekday()]

    task_start_mins = parse_time_to_minutes(start_time)
    task_end_mins = parse_time_to_minutes(end_time)

    for course in enrolled_courses:
        c_obj = course if hasattr(course, "schedules") else course.get("course")
        if not c_obj:
            continue

        c_start = getattr(c_obj, "start_date", None)
        c_end = getattr(c_obj, "end_date", None)

        if c_start and c_end:
            s1 = target_dt if target_dt.tzinfo else target_dt.replace(tzinfo=timezone.utc)
            s2 = c_start if c_start.tzinfo else c_start.replace(tzinfo=timezone.utc)
            e2 = c_end if c_end.tzinfo else c_end.replace(tzinfo=timezone.utc)
            if not (s2 <= s1 <= e2):
                continue  # Outside active course date range

        for sched in (getattr(c_obj, "schedules", []) or []):
            s_day = sched.day_of_week.strip().lower()
            if s_day == target_day_name.lower():
                s_start_mins = parse_time_to_minutes(sched.start_time)
                s_end_mins = parse_time_to_minutes(sched.end_time)

                if task_start_mins < s_end_mins and s_start_mins < task_end_mins:
                    ov_start = max(task_start_mins, s_start_mins)
                    ov_end = min(task_end_mins, s_end_mins)
                    return {
                        "course_id": c_obj.id,
                        "course_code": c_obj.code,
                        "course_name": c_obj.name,
                        "day_of_week": sched.day_of_week,
                        "fixed_start_time": sched.start_time,
                        "fixed_end_time": sched.end_time,
                        "task_start_time": start_time,
                        "task_end_time": end_time,
                        "overlap_start_time": minutes_to_time_str(ov_start),
                        "overlap_end_time": minutes_to_time_str(ov_end),
                    }

    return None
