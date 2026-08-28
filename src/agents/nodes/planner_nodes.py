import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from src.agents.planner_state import PlannerAgentState
from src.agents.tools.planner_tools import PlannerTools
from src.db.enums import normalize_priority
from src.services.llm import get_llm

logger = logging.getLogger(__name__)

WEEKDAY_MAP = {
    "thứ 2": 0, "thứ hai": 0, "mon": 0, "monday": 0, "t2": 0, "thu 2": 0, "thu hai": 0,
    "thứ 3": 1, "thứ ba": 1, "tue": 1, "tuesday": 1, "t3": 1, "thu 3": 1, "thu ba": 1,
    "thứ 4": 2, "thứ tư": 2, "wed": 2, "wednesday": 2, "t4": 2, "thu 4": 2, "thu tư": 2, "thu tu": 2,
    "thứ 5": 3, "thứ năm": 3, "thu": 3, "thursday": 3, "t5": 3, "thu 5": 3, "thu nam": 3,
    "thứ 6": 4, "thứ sáu": 4, "fri": 4, "friday": 4, "t6": 4, "thu 6": 4, "thu sau": 4,
    "thứ 7": 5, "thứ bảy": 5, "sat": 5, "saturday": 5, "t7": 5, "thu 7": 5, "thu bay": 5,
    "chủ nhật": 6, "cn": 6, "sun": 6, "sunday": 6, "chu nhat": 6,
    "cuối tuần": 5, "weekend": 5, "cuoi tuan": 5,
    "đầu tuần": 0, "dau tuan": 0,
    "giữa tuần": 2, "giua tuan": 2,
}

COURSE_SYNONYMS = {
    "cv": ["thị giác máy tính", "computer vision", "tgmt", "tgmt01"],
    "tgmt": ["thị giác máy tính", "computer vision", "cv", "tgmt01"],
    "tgmt01": ["thị giác máy tính", "computer vision", "cv", "tgmt"],
    "thị giác máy tính": ["computer vision", "cv", "tgmt", "tgmt01"],
    "computer vision": ["thị giác máy tính", "cv", "tgmt", "tgmt01"],
    "kpdl": ["khai phá dữ liệu", "data mining", "kpdl01"],
    "kpdl01": ["khai phá dữ liệu", "data mining", "kpdl"],
    "khai phá dữ liệu": ["data mining", "kpdl", "kpdl01"],
    "data mining": ["khai phá dữ liệu", "kpdl", "kpdl01"],
    "ptdl": ["phân tích dữ liệu", "data analysis", "business analytics"],
    "phân tích dữ liệu": ["data analysis", "ptdl"],
    "data analysis": ["phân tích dữ liệu", "ptdl"],
    "ai": ["trí tuệ nhân tạo", "artificial intelligence", "môn ai"],
    "dsa": ["cấu trúc dữ liệu", "data structures"],
}


def parse_task_datetime_from_text(
    title: str | None,
    description: str | None,
    week_start_str: str,
    user_request: str | None = None,
) -> tuple[str | None, str | None, str | None]:
    """
    Parse task title, description, and optional user_request for explicit/relative weekday and start/end time hints.
    Returns (scheduled_date, start_time, end_time).
    """
    text = f"{title or ''} {description or ''}".lower()
    req_text = (user_request or "").lower()
    if not text.strip() and not req_text.strip():
        return None, None, None

    try:
        start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    except Exception:
        return None, None, None

    target_date_str = None
    target_start_time = None
    target_end_time = None

    # 1. Match Weekday (e.g. "thứ 6", "thứ sáu", "cuối tuần", "weekend") in task title/description first
    for pattern, day_idx in WEEKDAY_MAP.items():
        if re.search(r'(?:\b|_)' + re.escape(pattern) + r'(?:\b|_)', text):
            target_day = start_date + timedelta(days=day_idx)
            target_date_str = target_day.strftime("%Y-%m-%d")
            break

    # If no explicit weekday in task text, check user_request!
    if not target_date_str and req_text:
        for pattern, day_idx in WEEKDAY_MAP.items():
            if re.search(r'(?:\b|_)' + re.escape(pattern) + r'(?:\b|_)', req_text):
                target_day = start_date + timedelta(days=day_idx)
                target_date_str = target_day.strftime("%Y-%m-%d")
                break

    combined_text = f"{text} {req_text}"

    # 2. Match Explicit Time Range first (e.g. "từ 08:00 đến 10:30", "08:00 - 10:30", "8h đến 10h30", "from 8 to 10")
    range_match = re.search(r'(?:từ|from)?\s*(\d{1,2})(?:h|:(\d{2}))?\s*(?:đến|tới|to|-)\s*(\d{1,2})(?:h|:(\d{2}))?', combined_text)
    if range_match:
        try:
            sh_val = int(range_match.group(1))
            sm_val = int(range_match.group(2)) if range_match.group(2) else 0
            eh_val = int(range_match.group(3))
            em_val = int(range_match.group(4)) if range_match.group(4) else 0
            if (re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', combined_text) or "pm" in combined_text) and sh_val < 12:
                sh_val += 12
                if eh_val < 12:
                    eh_val += 12
            # Handle inverted range (e.g. 22:00 to 20:00 -> swap to 20:00 to 22:00)
            if sh_val * 60 + sm_val > eh_val * 60 + em_val:
                sh_val, eh_val = eh_val, sh_val
                sm_val, em_val = em_val, sm_val
            elif sh_val * 60 + sm_val == eh_val * 60 + em_val:
                eh_val = min(23, sh_val + 1)
            if 0 <= sh_val <= 23 and 0 <= eh_val <= 23:
                target_start_time = f"{sh_val:02d}:{sm_val:02d}"
                target_end_time = f"{eh_val:02d}:{em_val:02d}"
        except Exception:
            pass

    # 3. Match Single Explicit Start Time (e.g. "20h", "20:00", "20h30", "8h tối", "8pm", "after 8pm")
    if target_start_time is None:
        explicit_time = re.search(r'(\d{1,2})\s*(?:h|:(\d{2})|giờ|pm)', text) or re.search(r'(\d{1,2})\s*(?:h|:(\d{2})|giờ|pm)', req_text)
        if explicit_time:
            try:
                h_val = int(explicit_time.group(1))
                m_val = int(explicit_time.group(2)) if explicit_time.group(2) else 0
                if (re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', combined_text) or "pm" in combined_text) and h_val < 12:
                    h_val += 12
                if 0 <= h_val <= 23:
                    target_start_time = f"{h_val:02d}:{m_val:02d}"
                    end_h = h_val + 1 if h_val < 23 else 23
                    end_m = (m_val + 30) % 60
                    if m_val + 30 >= 60 and end_h < 23:
                        end_h += 1
                    target_end_time = f"{end_h:02d}:{end_m:02d}"
            except Exception:
                pass

    # 4. Fallback to Period of Day if no explicit digits were found
    if target_start_time is None:
        if re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', combined_text) or "evening" in combined_text or "night" in combined_text:
            target_start_time = "20:00"
            target_end_time = "21:30"
        elif re.search(r'\b(?:buổi\s+)?chiều\b', combined_text) or "afternoon" in combined_text:
            target_start_time = "14:00"
            target_end_time = "15:30"
        elif re.search(r'\b(?:buổi\s+)?trưa\b', combined_text) or "noon" in combined_text or "lunch" in combined_text:
            target_start_time = "12:00"
            target_end_time = "13:00"
        elif re.search(r'\b(?:buổi\s+)?sáng\b', combined_text) or "morning" in combined_text:
            target_start_time = "09:00"
            target_end_time = "10:30"

    return target_date_str, target_start_time, target_end_time


def parse_user_time_and_days(
    user_request: str | None,
    week_start_str: str,
) -> tuple[list[str], str | None, str | None, int | None]:
    """
    Extract requested days of week, time of day, and custom duration from user prompt.
    Returns (target_dates_list, target_start_time, target_end_time, custom_duration_mins).
    """
    if not user_request or not user_request.strip():
        return [], None, None, None

    req_text = user_request.lower()
    try:
        start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    except Exception:
        return [], None, None, None

    target_dates: list[str] = []

    # Map days of the week in planning week
    day_matches = [
        (["thứ 2", "thứ hai", "t2", "monday", "mon", "thu 2", "thu hai"], 0),
        (["thứ 3", "thứ ba", "t3", "tuesday", "tue", "thu 3", "thu ba"], 1),
        (["thứ 4", "thứ tư", "t4", "wednesday", "wed", "thu 4", "thu tu"], 2),
        (["thứ 5", "thứ năm", "t5", "thursday", "thu", "thu 5", "thu nam"], 3),
        (["thứ 6", "thứ sáu", "t6", "friday", "fri", "thu 6", "thu sau"], 4),
        (["thứ 7", "thứ bảy", "t7", "saturday", "sat", "thu 7", "thu bay"], 5),
        (["chủ nhật", "cn", "sunday", "sun", "chu nhat"], 6),
    ]

    for patterns, day_idx in day_matches:
        for p in patterns:
            if re.search(r'(?:\b|_)' + re.escape(p) + r'(?:\b|_)', req_text):
                d_str = (start_date + timedelta(days=day_idx)).strftime("%Y-%m-%d")
                if d_str not in target_dates:
                    target_dates.append(d_str)
                break

    if ("cuối tuần" in req_text or "weekend" in req_text or "cuoi tuan" in req_text) and not target_dates:
        target_dates.append((start_date + timedelta(days=5)).strftime("%Y-%m-%d"))
        target_dates.append((start_date + timedelta(days=6)).strftime("%Y-%m-%d"))

    # Duration parsing (e.g. "mỗi ngày 30 phút", "mỗi buổi 2 tiếng", "15 phút", "1 tiếng")
    custom_duration = None
    dur_match = re.search(r'(\d+)\s*(?:tiếng|giờ|hour|hours|h\b)', req_text)
    if dur_match:
        try:
            custom_duration = int(dur_match.group(1)) * 60
        except Exception:
            pass
    if custom_duration is None:
        min_match = re.search(r'(\d+)\s*(?:phút|min|mins|p\b)', req_text)
        if min_match:
            try:
                custom_duration = int(min_match.group(1))
            except Exception:
                pass

    # Psychological / Light workload cues
    if custom_duration is None and any(w in req_text for w in ["nhẹ nhàng", "lười", "stress", "học ít", "it ma hieu qua", "pass môn", "vừa đủ", "it ma", "ngợp", "mệt"]):
        custom_duration = 30

    # Time of day detection
    target_start = None
    target_end = None

    # Check explicit range first
    range_match = re.search(r'(?:từ|from)?\s*(\d{1,2})(?:h|:(\d{2}))?\s*(?:đến|tới|to|-)\s*(\d{1,2})(?:h|:(\d{2}))?', req_text)
    if range_match:
        try:
            sh_val = int(range_match.group(1))
            sm_val = int(range_match.group(2)) if range_match.group(2) else 0
            eh_val = int(range_match.group(3))
            em_val = int(range_match.group(4)) if range_match.group(4) else 0
            if (re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', req_text) or "pm" in req_text) and sh_val < 12:
                sh_val += 12
                if eh_val < 12:
                    eh_val += 12
            # Handle inverted range
            if sh_val * 60 + sm_val > eh_val * 60 + em_val:
                sh_val, eh_val = eh_val, sh_val
                sm_val, em_val = em_val, sm_val
            elif sh_val * 60 + sm_val == eh_val * 60 + em_val:
                eh_val = min(23, sh_val + 1)
            if 0 <= sh_val <= 23 and 0 <= eh_val <= 23:
                target_start = f"{sh_val:02d}:{sm_val:02d}"
                target_end = f"{eh_val:02d}:{em_val:02d}"
                custom_duration = (eh_val * 60 + em_val) - (sh_val * 60 + sm_val)
        except Exception:
            pass

    if custom_duration is not None:
        custom_duration = max(15, min(custom_duration, 240))

    if target_start is None:
        explicit_time = re.search(r'(\d{1,2})\s*(?:h|:(\d{2})|giờ|pm)', req_text)
        if explicit_time:
            try:
                h_val = int(explicit_time.group(1))
                m_val = int(explicit_time.group(2)) if explicit_time.group(2) else 0
                if (re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', req_text) or "pm" in req_text) and h_val < 12:
                    h_val += 12
                if 0 <= h_val <= 23:
                    target_start = f"{h_val:02d}:{m_val:02d}"
                    dur = custom_duration or 90
                    end_min_total = h_val * 60 + m_val + dur
                    end_h = min(23, end_min_total // 60)
                    end_m = end_min_total % 60
                    target_end = f"{end_h:02d}:{end_m:02d}"
            except Exception:
                pass

    if target_start is None:
        if re.search(r'\b(?:buổi\s+)?sáng\b', req_text) or "morning" in req_text:
            target_start = "09:00"
            dur = custom_duration or 90
            end_h = 9 + (dur // 60)
            end_m = dur % 60
            target_end = f"{min(23, end_h):02d}:{end_m:02d}"
        elif re.search(r'\b(?:buổi\s+)?chiều\b', req_text) or "afternoon" in req_text:
            target_start = "14:00"
            dur = custom_duration or 90
            end_h = 14 + (dur // 60)
            end_m = dur % 60
            target_end = f"{min(23, end_h):02d}:{end_m:02d}"
        elif re.search(r'\b(?:buổi\s+)?(?:tối|toi)(?!\s*(?:ưu|đa|thiểu|mật|hậu|thượng|uu|da|thieu))\b', req_text) or "evening" in req_text or "night" in req_text:
            target_start = "20:00"
            dur = custom_duration or 90
            end_h = 20 + (dur // 60)
            end_m = dur % 60
            target_end = f"{min(23, end_h):02d}:{end_m:02d}"

    return target_dates, target_start, target_end, custom_duration


PLANNER_SYSTEM_PROMPT = """
You are an expert AI Student Study Planner for the Learning Companion.

YOUR OBJECTIVE:
You are an intelligent agent that creates custom, realistic Study Plans. You must handle all kinds of student requests, including short/blunt prompts, detailed schedules, tight time constraints, reschedules/cancellations, stress/low motivation requests, Vietnamese slang/teencode (e.g. "xep lich", "k ranh toi t3"), and English-Vietnamese mix (e.g. "make schedule", "focus lab").

Follow this 3-step reasoning workflow for EVERY request:

STEP 1: UNDERSTAND STUDENT INTENT & CONSTRAINTS (HIGHEST PRIORITY)
Read the `STUDENT REQUEST` carefully to extract:
1. Target Course / Subject Focus: Did the student ask for specific courses or abbreviations? (e.g., "CV", "TGMT", "Data Mining", "KPDL", "PTDL", "Machine Learning").
2. Session Count & Workload / Psychological State:
   - If student asks for 1 session (e.g. "chỉ 1 buổi", "ko cần tạo buổi nào khác"), output EXACTLY 1 task in `tasks`.
   - If student is stressed/lazy ("lười", "stress", "học ít", "nhẹ nhàng"), schedule shorter 30-45 min sessions, encourage them in `summary`.
   - If student specifies duration ("mỗi buổi 2 tiếng", "mỗi ngày 30 phút"), adjust `estimated_duration` and end_time accordingly!
3. Target Dates & Days & Times: (e.g., "sau 20h", "chỉ rảnh sáng thứ 7", "cuối tuần", "bù cho buổi tối qua").

STEP 2: MATCH DATABASE CONTEXT WITH STUDENT INTENT
Inspect the provided `assignments`, `courses`, and `course_materials` in `PLANNER CONTEXT`:
- Match the student's requested subject/course with the corresponding real course and assignment in the context.
- IF STEP 1 identified a specific Target Course/Subject:
  * You MUST select ONLY assignments, course materials, and tasks belonging to that exact target course.
  * Strictly forbid mixing in tasks, assignments, or materials from any other courses.
- IF no specific target course/subject was identified:
  * Distribute tasks logically across active courses with upcoming deadlines.

STEP 3: GENERATE THE TAILORED STUDY PLAN
- Ground study session details (`what_to_study`, `what_to_do`, `material_title`) in the real course materials and assignment specs.
- If student requests reschedule / cancellation ("dời lịch sang cuối tuần", "hủy buổi tối nay"), move tasks to the requested days and note it in `summary`.

CRITICAL GROUNDING & NO-HALLUCINATION RULES:
1. Ground study tasks strictly in real context. Include exact `material_id` and `material_title` if matching material exists.
2. NEVER invent fake courses, materials, or assignment titles not present in context.

DATE & TIME CONSTRAINTS:
1. FIXED UNIVERSITY CLASS SCHEDULES ARE IMMUTABLE HARD CONSTRAINTS. NEVER schedule during hours occupied by a fixed university class!
2. If a task has an assignment deadline, its `scheduled_date` and `end_time` MUST be strictly BEFORE that deadline!
3. Weekday Date Mapping ({week_start} to {week_end}):
{weekday_mapping}
4. priority MUST be strictly one of: "low", "medium", "high", "urgent".

OUTPUT FORMAT:
Respond strictly with a valid JSON object formatted as follows:
{{
  "plan_title": "Kế hoạch học tập ({week_start} đến {week_end})",
  "summary": "Tóm tắt ngắn gọn mục tiêu và định hướng kế hoạch theo yêu cầu học sinh...",
  "warnings": ["Cảnh báo hoặc lưu ý nếu có yêu cầu mâu thuẫn..."],
  "skipped_items": [{{"title": "Mục hoãn", "reason": "Lý do..."}}],
  "tasks": [
    {{
      "title": "Machine Learning Fundamentals",
      "topic": "Machine Learning",
      "what_to_study": ["Supervised Learning concepts", "Linear Regression fundamentals"],
      "what_to_do": [
        "1. Ôn lại bài giảng liên quan",
        "2. Xem các ví dụ minh họa",
        "3. Tóm tắt các công thức cốt lõi"
      ],
      "reason": "Theo yêu cầu ôn tập môn Machine Learning vào Thứ 7.",
      "course_id": "course_uuid",
      "course_name": "Machine Learning",
      "material_id": "material_uuid_or_null",
      "material_title": "Lecture 01 — Fundamentals",
      "assignment_id": "assignment_uuid_or_null",
      "assignment_title": "Assignment 1",
      "goal_id": null,
      "goal_title": null,
      "scheduled_date": "YYYY-MM-DD",
      "start_time": "19:00",
      "end_time": "20:30",
      "priority": "high",
      "estimated_duration": 90,
      "source_type": "ASSIGNMENT",
      "source_id": "assignment_uuid"
    }}
  ]
}}
"""


def try_match_target_course(user_request: str, context_dict: dict[str, Any]) -> str | None:
    """Matches a course name (from context_dict) appearing in user_request (case-insensitive)."""
    if not user_request or not context_dict:
        return None

    user_req_lower = user_request.lower()

    # Collect candidate courses from context_dict["courses"] as well as assignments, course_materials, fixed_course_schedules
    courses = list(context_dict.get("courses", []))
    seen_ids = {
        c.get("id") or c.get("course_id")
        for c in courses
        if isinstance(c, dict) and (c.get("id") or c.get("course_id"))
    }

    for collection in [
        context_dict.get("assignments", []),
        context_dict.get("course_materials", []),
        context_dict.get("fixed_course_schedules", []),
    ]:
        if isinstance(collection, list):
            for item in collection:
                if isinstance(item, dict):
                    c_id = item.get("course_id")
                    c_name = item.get("course_name")
                    if c_id and c_id not in seen_ids:
                        courses.append({"id": c_id, "name": c_name, "code": item.get("course_code")})
                        seen_ids.add(c_id)

    best_match_id = None
    max_match_len = 0

    for c in courses:
        if not isinstance(c, dict):
            continue
        cid = c.get("id") or c.get("course_id")
        if not cid:
            continue

        possible_names = []
        for key in [
            "name",
            "course_name",
            "title",
            "name_vi",
            "vietnamese_name",
            "name_en",
            "english_name",
            "code",
            "course_code",
        ]:
            val = c.get(key)
            if val and isinstance(val, str):
                possible_names.append(val.strip())
                if "(" in val:
                    parts = val.replace(")", "").split("(")
                    possible_names.extend([p.strip() for p in parts if p.strip()])
                if "/" in val:
                    parts = val.split("/")
                    possible_names.extend([p.strip() for p in parts if p.strip()])

        for name in possible_names:
            name_lower = name.lower()
            # Direct match with word boundaries
            if len(name_lower) >= 2 and re.search(r'(?:\b|_)' + re.escape(name_lower) + r'(?:\b|_)', user_req_lower):
                if len(name_lower) > max_match_len:
                    max_match_len = len(name_lower)
                    best_match_id = cid

            # Synonym match (e.g. CV -> Thị giác máy tính, KPDL -> Khai phá dữ liệu)
            for syn_key, syn_list in COURSE_SYNONYMS.items():
                syn_key_matched = re.search(r'(?:\b|_)' + re.escape(syn_key) + r'(?:\b|_)', name_lower) is not None
                syn_list_matched = any(re.search(r'(?:\b|_)' + re.escape(s) + r'(?:\b|_)', name_lower) for s in syn_list)
                if syn_key_matched or syn_list_matched:
                    # If the user mentioned either the key or any synonym in user_request
                    all_syns = [syn_key] + syn_list
                    for s in all_syns:
                        if re.search(r'(?:\b|_)' + re.escape(s) + r'(?:\b|_)', user_req_lower):
                            if len(s) > max_match_len:
                                max_match_len = len(s)
                                best_match_id = cid

    return best_match_id


def filter_context_to_course(context_dict: dict[str, Any], course_id: str) -> dict[str, Any]:
    """Trims context_dict lists containing course_id down to only the entries belonging to that course_id."""
    if not context_dict or not course_id:
        return context_dict

    filtered = dict(context_dict)

    for key, val in context_dict.items():
        if isinstance(val, list):
            if key == "courses":
                filtered[key] = [
                    item for item in val
                    if isinstance(item, dict) and (item.get("id") == course_id or item.get("course_id") == course_id)
                ]
            else:
                filtered[key] = [
                    item for item in val
                    if not (isinstance(item, dict) and "course_id" in item) or item.get("course_id") == course_id
                ]

    return filtered


def validate_scheduled_before_deadline(
    decision: dict[str, Any],
    context_dict: dict[str, Any],
    week_start: str = "",
    user_request: str = "",
) -> dict[str, Any]:
    """
    Validates and auto-adjusts task scheduled_date & start_time/end_time so they finish strictly before
    the related assignment due date/time.
    """
    if not isinstance(decision, dict) or "tasks" not in decision:
        return decision

    assignments = context_dict.get("assignments", []) if isinstance(context_dict, dict) else []
    assignment_due_dts: dict[str, datetime] = {}
    assignment_title_map: dict[str, datetime] = {}

    for ass in assignments:
        if isinstance(ass, dict):
            ass_id = ass.get("id")
            title = (ass.get("title") or "").strip().lower()
            due_raw = ass.get("due_date") or ass.get("due_at")
            if due_raw:
                try:
                    due_str = str(due_raw).rstrip("Z")
                    if "T" in due_str:
                        due_str = due_str.replace("T", " ")

                    if len(due_str) > 10 and ":" in due_str:
                        due_dt = datetime.strptime(due_str[:19], "%Y-%m-%d %H:%M:%S")
                    else:
                        due_dt = datetime.strptime(due_str[:10], "%Y-%m-%d").replace(hour=23, minute=59, second=59)

                    if ass_id:
                        assignment_due_dts[ass_id] = due_dt
                    if title:
                        assignment_title_map[title] = due_dt
                except Exception:
                    pass

    tasks = decision.get("tasks", [])
    if not isinstance(tasks, list) or not tasks:
        return decision

    start_date_obj = None
    if week_start:
        try:
            start_date_obj = datetime.strptime(week_start, "%Y-%m-%d").date()
        except Exception:
            pass

    adjusted_tasks = []
    for task in tasks:
        if not isinstance(task, dict):
            adjusted_tasks.append(task)
            continue

        ass_id = task.get("assignment_id") or task.get("source_id")
        task_topic = (task.get("topic") or task.get("title") or task.get("assignment_title") or "").strip().lower()

        due_dt = None
        if ass_id and ass_id in assignment_due_dts:
            due_dt = assignment_due_dts[ass_id]
        elif task_topic:
            for t_title, d_dt in assignment_title_map.items():
                if t_title in task_topic or task_topic in t_title:
                    due_dt = d_dt
                    break

        if due_dt:
            sched_raw = task.get("scheduled_date")
            start_time_str = task.get("start_time") or "19:00"
            end_time_str = task.get("end_time") or "20:30"

            sched_date = None
            if sched_raw:
                try:
                    clean_sched = str(sched_raw).split("T")[0].rstrip("Z")
                    sched_date = datetime.strptime(clean_sched, "%Y-%m-%d").date()
                except Exception:
                    pass

            if not sched_date:
                sched_date = due_dt.date()

            # Parse start and end datetime of the proposed study session
            try:
                s_h, s_m = map(int, start_time_str.split(":")[:2])
                task_start_dt = datetime.combine(sched_date, datetime.min.time()).replace(hour=s_h, minute=s_m)
            except Exception:
                task_start_dt = datetime.combine(sched_date, datetime.min.time()).replace(hour=19, minute=0)

            try:
                e_h, e_m = map(int, end_time_str.split(":")[:2])
                task_end_dt = datetime.combine(sched_date, datetime.min.time()).replace(hour=e_h, minute=e_m)
            except Exception:
                task_end_dt = task_start_dt + timedelta(minutes=90)

            # Violation: study session ends after/at due_dt, or starts after due_dt
            if task_end_dt >= due_dt or task_start_dt >= due_dt:
                logger.warning(
                    f"Task '{task.get('title')}' ({task_start_dt} to {task_end_dt}) violates assignment deadline ({due_dt}). Auto-adjusting schedule."
                )

                # Step 1: Default to 1 day before due_date in evening (19:00 - 20:30)
                new_date = due_dt.date() - timedelta(days=1)

                # Bounded by planning week start
                if start_date_obj and new_date < start_date_obj:
                    new_date = start_date_obj

                # If new_date is same as due_dt.date(), check if morning hours fit before due_dt
                if new_date == due_dt.date():
                    due_min = due_dt.hour * 60 + due_dt.minute
                    if due_min >= 600:  # Deadline is at/after 10:00 AM
                        new_start = "08:00"
                        new_end = "09:30"
                    else:
                        # Deadline is earlier than 10:00 AM, shift date to previous day if possible
                        new_date = due_dt.date() - timedelta(days=1)
                        if start_date_obj and new_date < start_date_obj:
                            new_date = start_date_obj
                        new_start = "19:00"
                        new_end = "20:30"
                else:
                    new_start = "19:00"
                    new_end = "20:30"

                task["scheduled_date"] = new_date.strftime("%Y-%m-%d")
                task["start_time"] = new_start
                task["end_time"] = new_end
                due_fmt = due_dt.strftime("%d/%m/%Y %H:%M") if (due_dt.hour or due_dt.minute) else due_dt.strftime("%d/%m/%Y")
                reason_clean = task.get('reason') or ''
                task["reason"] = f"{reason_clean} (Tự động sắp xếp trước hạn nộp {due_fmt}).".strip()

        adjusted_tasks.append(task)

    decision["tasks"] = adjusted_tasks
    return decision



async def load_context_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 1: Load student's Planner Context via PlannerTools."""
    db = state["db"]
    current_user = state["current_user"]
    week_start = state.get("week_start")
    start_date = state.get("start_date")
    end_date = state.get("end_date")
    target_assignment_id = state.get("assignment_id")

    try:
        context = await PlannerTools.get_planner_context(
            db,
            current_user,
            week_start=week_start,
            start_date=start_date,
            end_date=end_date,
            target_assignment_id=target_assignment_id,
        )
        return {
            "context": context,
            "week_start": context.planning_period.week_start,
            "week_end": context.planning_period.week_end,
        }
    except Exception as e:
        logger.error(f"Error loading planner context: {e}")
        return {"error": f"Failed to load planner context: {e}"}


async def analyze_and_decide_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 2: Prompt LLM to analyze context and return structured planning decision."""
    if state.get("error"):
        return {}

    context = state["context"]
    user_request = state.get("user_request", "Tự động lập kế hoạch học tập tối ưu.")

    # Context formatting for prompt
    context_dict = context.model_dump() if hasattr(context, "model_dump") else context

    # 1. Hard filter context to target course if user_request matches a specific course
    target_course_id = try_match_target_course(user_request, context_dict)
    if target_course_id:
        context_dict = filter_context_to_course(context_dict, target_course_id)

    week_start = context_dict.get("planning_period", {}).get("week_start", state.get("week_start"))
    week_end = context_dict.get("planning_period", {}).get("week_end", state.get("week_end"))

    start_dt = datetime.strptime(week_start, "%Y-%m-%d").date()
    end_dt = datetime.strptime(week_end, "%Y-%m-%d").date() if week_end else start_dt + timedelta(days=6)
    total_days = max(1, (end_dt - start_dt).days + 1)
    days_names = ["Monday (Thứ Hai)", "Tuesday (Thứ Ba)", "Wednesday (Thứ Tư)", "Thursday (Thứ Năm)", "Friday (Thứ Sáu)", "Saturday (Thứ Bảy)", "Sunday (Chủ Nhật)"]
    mapping_str = "\n".join([
        f"- {(start_dt + timedelta(days=i)).strftime('%Y-%m-%d')} ({days_names[(start_dt + timedelta(days=i)).weekday()]})"
        for i in range(total_days)
    ])

    system_prompt = PLANNER_SYSTEM_PROMPT.format(
        week_start=week_start,
        week_end=week_end,
        weekday_mapping=mapping_str,
    )

    user_msg_content = f"""
STUDENT REQUEST:
"{user_request}"

IMPORTANT AGENT DIRECTIVE:
Process the STUDENT REQUEST above step-by-step:
1. Parse the student's intent, requested courses/subjects, requested date/day, and requested session count.
2. Filter the PLANNER CONTEXT below to ONLY include assignments and materials relevant to the student's requested course/subject.
3. If the student asks for 1 session (e.g. "chỉ cần bạn tạo một buổi đó thôi, ko cần tạo buổi nào khác"), output EXACTLY 1 task in the `tasks` JSON array!

PLANNER CONTEXT (Real database context - Assignments, Courses, Goals, Materials):
{json.dumps(context_dict, indent=2, ensure_ascii=False)}
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg_content),
    ]

    try:
        llm = get_llm(temperature=0.2)
        response = await llm.ainvoke(messages)
        content = response.content if hasattr(response, "content") else str(response)

        # Parse JSON from response
        clean_content = content.strip()
        if "```json" in clean_content:
            clean_content = clean_content.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_content:
            clean_content = clean_content.split("```")[1].split("```")[0].strip()

        decision = json.loads(clean_content)

        # Post-LLM validation 1: if target_course_id was matched, keep only tasks belonging to target_course_id
        if target_course_id and isinstance(decision, dict) and "tasks" in decision:
            filtered_tasks = [
                task for task in decision.get("tasks", [])
                if task.get("course_id") == target_course_id
            ]
            if not filtered_tasks:
                logger.warning(
                    f"Post-LLM validation failed: No tasks matched target_course_id '{target_course_id}'. Calling fallback decision."
                )
                decision = create_fallback_decision(context_dict, week_start, user_request)
            else:
                decision["tasks"] = filtered_tasks

        # Post-LLM validation 2: validate scheduled_date is strictly before assignment due date
        decision = validate_scheduled_before_deadline(decision, context_dict, week_start, user_request)

        return {"plan_decision": decision}
    except Exception as e:
        logger.error(f"LLM call or JSON parsing error in analyze_and_decide_node: {e}", exc_info=True)
        # Fallback decision if LLM call fails or returns non-JSON
        fallback_decision = create_fallback_decision(context_dict, week_start, user_request)
        return {"plan_decision": fallback_decision}


def create_fallback_decision(context_dict: dict[str, Any], week_start: str, user_request: str) -> dict[str, Any]:
    """Fallback planner decision when LLM returns unstructured output."""
    tasks = []
    skipped = []

    curr_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    materials = context_dict.get("course_materials", [])
    p_date, p_start, p_end = parse_task_datetime_from_text(None, None, week_start, user_request)

    for idx, ass in enumerate(context_dict.get("assignments", [])):
        due_str = ass.get("due_date") or ass.get("due_at")
        due_dt = None
        if due_str:
            try:
                ds = str(due_str).rstrip("Z").replace("T", " ")
                if len(ds) > 10 and ":" in ds:
                    due_dt = datetime.strptime(ds[:19], "%Y-%m-%d %H:%M:%S")
                else:
                    due_dt = datetime.strptime(ds[:10], "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            except Exception:
                pass

        if p_date:
            try:
                target_day = datetime.strptime(p_date, "%Y-%m-%d").date()
            except Exception:
                target_day = curr_date
            f_start = p_start or "19:00"
            f_end = p_end or "20:30"
        elif due_dt:
            # Schedule 1 day before due date if possible
            target_day = due_dt.date() - timedelta(days=1)
            if target_day < curr_date:
                target_day = curr_date

            # If target day is same as due date and deadline is morning/noon, set morning study session
            if target_day == due_dt.date() and (due_dt.hour * 60 + due_dt.minute) <= 660:
                f_start = "08:00"
                f_end = "09:30"
            else:
                f_start = "19:00"
                f_end = "20:30"
        else:
            target_day = curr_date + timedelta(days=idx % 5)
            f_start = "19:00"
            f_end = "20:30"

        matched_mat = next((m for m in materials if m.get("course_id") == ass.get("course_id")), None)
        mat_id = matched_mat.get("id") if matched_mat else None
        mat_title = matched_mat.get("title") if matched_mat else "No matching course material was found."

        due_display = due_dt.strftime("%d/%m/%Y %H:%M") if due_dt and (due_dt.hour or due_dt.minute) else (ass.get('due_date') or 'N/A')

        tasks.append({
            "title": f"Ôn tập & Chuẩn bị: {ass.get('title')}",
            "topic": ass.get("title"),
            "what_to_study": ["Xem lại kiến thức môn học", "Đọc yêu cầu bài tập"],
            "what_to_do": ["1. Xem lại bài giảng liên quan", "2. Thực hành kiến thức", "3. Hoàn thành bài tập"],
            "reason": f"Bài tập môn {ass.get('course_name', '')} hạn nộp ({due_display}).",
            "course_id": ass.get("course_id"),
            "course_name": ass.get("course_name"),
            "material_id": mat_id,
            "material_title": mat_title,
            "assignment_id": ass.get("id"),
            "assignment_title": ass.get("title"),
            "scheduled_date": target_day.strftime("%Y-%m-%d"),
            "start_time": f_start,
            "end_time": f_end,
            "priority": normalize_priority(ass.get("priority", "high")),
            "estimated_duration": 90,
            "source_type": "ASSIGNMENT",
            "source_id": ass.get("id"),
        })

    return {
        "plan_title": f"Kế hoạch học tập {week_start}",
        "summary": "Đã tự động tạo kế hoạch học tập dựa trên bài tập và tài liệu môn học hiện có.",
        "warnings": [],
        "skipped_items": skipped,
        "tasks": tasks,
    }



def check_time_overlap(
    start1: str | None, end1: str | None, start2: str | None, end2: str | None
) -> bool:
    """Check if two time intervals [start1, end1) and [start2, end2) overlap."""
    if not start1 or not end1 or not start2 or not end2:
        return False
    return start1 < end2 and end1 > start2


def resolve_task_time_conflict(
    scheduled_date: str | None,
    start_time: str | None,
    end_time: str | None,
    existing_tasks: list[dict[str, Any]],
) -> tuple[str | None, str | None, str | None]:
    """
    Check if (scheduled_date, start_time, end_time) conflicts with existing tasks.
    If conflict exists, attempt to shift start_time/end_time to a non-overlapping slot.
    Returns (resolved_start_time, resolved_end_time, warning_msg_or_none).
    """
    if not scheduled_date or not start_time or not end_time:
        return start_time, end_time, None

    same_day_tasks = [
        t
        for t in existing_tasks
        if t.get("scheduled_date") == scheduled_date
        and t.get("start_time")
        and t.get("end_time")
    ]

    conflicting_task = None
    for t in same_day_tasks:
        if check_time_overlap(start_time, end_time, t.get("start_time"), t.get("end_time")):
            conflicting_task = t
            break

    if not conflicting_task:
        return start_time, end_time, None

    # Calculate duration in minutes
    try:
        sh, sm = map(int, start_time.split(":"))
        eh, em = map(int, end_time.split(":"))
        duration_mins = (eh * 60 + em) - (sh * 60 + sm)
        if duration_mins <= 0:
            duration_mins = 60
    except Exception:
        duration_mins = 60

    # Build list of occupied intervals in minutes
    occupied = []
    for t in same_day_tasks:
        try:
            t_sh, t_sm = map(int, t["start_time"].split(":"))
            t_eh, t_em = map(int, t["end_time"].split(":"))
            occupied.append((t_sh * 60 + t_sm, t_eh * 60 + t_em))
        except Exception:
            pass

    occupied.sort(key=lambda x: x[0])

    # Search candidate slots from 08:00 (480 mins) to 22:00 (1320 mins)
    for cand_start in range(480, 1320, 30):
        cand_end = cand_start + duration_mins
        if cand_end > 1440:
            continue
        overlap = False
        for occ_start, occ_end in occupied:
            if cand_start < occ_end and cand_end > occ_start:
                overlap = True
                break
        if not overlap:
            new_sh, new_sm = divmod(cand_start, 60)
            new_eh, new_em = divmod(cand_end, 60)
            new_start_str = f"{new_sh:02d}:{new_sm:02d}"
            new_end_str = f"{new_eh:02d}:{new_em:02d}"
            warn = (
                f"Phát hiện xung đột lịch: Khung giờ ({start_time} - {end_time}) bị trùng với nhiệm vụ "
                f"'{conflicting_task.get('title', 'Nhiệm vụ khác')}'. Đã tự động đổi sang khung giờ ({new_start_str} - {new_end_str})."
            )
            return new_start_str, new_end_str, warn

    warn = (
        f"Cảnh báo xung đột lịch: Nhiệm vụ trùng khung giờ ({start_time} - {end_time}) "
        f"với nhiệm vụ '{conflicting_task.get('title', 'Nhiệm vụ khác')}'."
    )
    return start_time, end_time, warn


async def execute_planner_tools_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 3: Execute tool operations based on planning decision."""
    if state.get("error"):
        return {}

    db = state["db"]
    current_user = state["current_user"]
    week_start = state["week_start"]
    week_end = state.get("week_end")
    decision = state.get("plan_decision", {})

    created_tasks = []
    updated_tasks = []
    skipped_items = list(decision.get("skipped_items", []))
    warnings = list(decision.get("warnings", []))

    # 1. Fetch or create Plan
    try:
        plan = await PlannerTools.get_current_weekly_plan(db, current_user, week_start=week_start)
        if not plan:
            plan_title = decision.get("plan_title", f"Kế hoạch học tập {week_start}")
            plan = await PlannerTools.create_weekly_plan(
                db, current_user, week_start=week_start, week_end=week_end, title=plan_title
            )

        weekly_plan_id = plan.id
    except Exception as e:
        logger.error(f"Failed to get/create plan in agent execution: {e}")
        return {
            "error": f"Failed to handle plan: {e}",
            "weekly_plan_id": None,
            "created_tasks": [],
            "updated_tasks": [],
            "skipped_items": skipped_items,
            "warnings": [f"Lỗi tạo kế hoạch học tập: {e}"],
        }

    # 2. Track existing tasks & fixed university class schedules to avoid conflicts
    existing_tasks: list[dict[str, Any]] = []
    try:
        plan_tasks = await PlannerTools.get_weekly_plan_tasks(db, current_user, weekly_plan_id)
        for pt in plan_tasks:
            date_str = str(pt.scheduled_date).split("T")[0] if pt.scheduled_date else None
            existing_tasks.append({
                "title": pt.title,
                "scheduled_date": date_str,
                "start_time": pt.start_time,
                "end_time": pt.end_time,
            })

        # Load fixed class schedules and add as occupied slots
        context = await PlannerTools.get_planner_context(db, current_user, week_start=week_start)
        start_d = datetime.strptime(week_start, "%Y-%m-%d").date()
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for idx in range(7):
            d_curr = start_d + timedelta(days=idx)
            d_str = d_curr.strftime("%Y-%m-%d")
            d_day_name = day_names[idx]
            for fs in (context.fixed_course_schedules or []):
                if fs.day_of_week.strip().lower() == d_day_name.lower():
                    existing_tasks.append({
                        "title": f"Lịch học cố định: {fs.course_name}",
                        "scheduled_date": d_str,
                        "start_time": fs.start_time,
                        "end_time": fs.end_time,
                    })
    except Exception as e:
        logger.warning(f"Could not load existing tasks/fixed schedules for conflict checking: {e}")

    user_request = state.get("user_request")
    req_dates, req_start, req_end, req_duration = parse_user_time_and_days(user_request, week_start)

    for task_idx, task_data in enumerate(decision.get("tasks", [])):
        raw_date = task_data.get("scheduled_date")
        raw_start = task_data.get("start_time")
        raw_end = task_data.get("end_time")

        if req_dates:
            raw_date = req_dates[task_idx % len(req_dates)]
        elif not raw_date:
            p_date, _, _ = parse_task_datetime_from_text(
                task_data.get("title"), task_data.get("description"), week_start, user_request
            )
            if p_date:
                raw_date = p_date

        if (not raw_start or not raw_end) and req_start and req_end:
            raw_start = req_start
            raw_end = req_end
        elif not raw_start or not raw_end:
            _, p_start, p_end = parse_task_datetime_from_text(
                task_data.get("title"), task_data.get("description"), week_start, user_request
            )
            if p_start and p_end:
                raw_start = p_start
                raw_end = p_end

        if req_duration and not task_data.get("estimated_duration"):
            task_data["estimated_duration"] = req_duration

        eff_start, eff_end, conflict_warn = resolve_task_time_conflict(
            scheduled_date=raw_date,
            start_time=raw_start,
            end_time=raw_end,
            existing_tasks=existing_tasks,
        )

        if conflict_warn:
            warnings.append(conflict_warn)

        try:
            task_res = await PlannerTools.create_plan_task(
                db=db,
                current_user=current_user,
                weekly_plan_id=weekly_plan_id,
                title=task_data.get("title", "Buổi học tập"),
                description=task_data.get("description"),
                topic=task_data.get("topic"),
                what_to_study=task_data.get("what_to_study"),
                what_to_do=task_data.get("what_to_do"),
                reason=task_data.get("reason"),
                material_id=task_data.get("material_id"),
                material_title=task_data.get("material_title"),
                course_id=task_data.get("course_id"),
                course_name=task_data.get("course_name"),
                goal_id=task_data.get("goal_id"),
                goal_title=task_data.get("goal_title"),
                scheduled_date=raw_date,
                start_time=eff_start,
                end_time=eff_end,
                priority=normalize_priority(task_data.get("priority", "medium")),
                estimated_duration=task_data.get("estimated_duration"),
                source_type=task_data.get("source_type", "AI_PLAN") or "AI_PLAN",
                source_id=task_data.get("source_id"),
            )
            created_tasks.append(task_res.model_dump())
            existing_tasks.append({
                "title": task_data.get("title"),
                "scheduled_date": raw_date,
                "start_time": eff_start,
                "end_time": eff_end,
            })
        except Exception as e:
            try:
                await db.rollback()
            except Exception:
                pass
            warn_msg = f"Không thể lên lịch nhiệm vụ '{task_data.get('title')}': {e}"
            logger.warning(warn_msg)
            warnings.append(warn_msg)
            skipped_items.append({
                "title": task_data.get("title"),
                "reason": str(e),
            })

    return {
        "weekly_plan_id": weekly_plan_id,
        "created_tasks": created_tasks,
        "updated_tasks": updated_tasks,
        "skipped_items": skipped_items,
        "warnings": warnings,
        "summary": decision.get("summary", "Đã tạo thành công kế hoạch học tập."),
    }


async def resolve_proposed_tasks_for_preview(state: PlannerAgentState) -> dict[str, Any]:
    """
    Format and resolve date/time conflicts for proposed plan tasks WITHOUT saving to DB.
    Used for draft preview mode so the user can review before accepting.
    """
    if state.get("error"):
        return {}

    db = state.get("db")
    current_user = state.get("current_user")
    week_start = state.get("week_start")
    decision = state.get("plan_decision", {})

    proposed_tasks = []
    skipped_items = list(decision.get("skipped_items", []))
    warnings = list(decision.get("warnings", []))
    existing_tasks: list[dict[str, Any]] = []

    if db and current_user and week_start:
        try:
            # Check existing plan tasks
            plan = await PlannerTools.get_current_weekly_plan(db, current_user, week_start=week_start)
            if plan:
                plan_tasks = await PlannerTools.get_weekly_plan_tasks(db, current_user, plan.id)
                for pt in plan_tasks:
                    date_str = str(pt.scheduled_date).split("T")[0] if pt.scheduled_date else None
                    existing_tasks.append({
                        "title": pt.title,
                        "scheduled_date": date_str,
                        "start_time": pt.start_time,
                        "end_time": pt.end_time,
                    })

            # Check fixed course schedules
            context = await PlannerTools.get_planner_context(db, current_user, week_start=week_start)
            start_d = datetime.strptime(week_start, "%Y-%m-%d").date()
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            for idx in range(7):
                d_curr = start_d + timedelta(days=idx)
                d_str = d_curr.strftime("%Y-%m-%d")
                d_day_name = day_names[idx]
                for fs in (context.fixed_course_schedules or []):
                    if fs.day_of_week.strip().lower() == d_day_name.lower():
                        existing_tasks.append({
                            "title": f"Lịch học cố định: {fs.course_name}",
                            "scheduled_date": d_str,
                            "start_time": fs.start_time,
                            "end_time": fs.end_time,
                        })
        except Exception as e:
            logger.warning(f"Could not load existing schedule for preview conflict checking: {e}")

    user_request = state.get("user_request")
    req_dates, req_start, req_end, req_duration = parse_user_time_and_days(user_request, week_start)

    for task_idx, task_data in enumerate(decision.get("tasks", [])):
        raw_date = task_data.get("scheduled_date")
        raw_start = task_data.get("start_time")
        raw_end = task_data.get("end_time")

        if req_dates:
            raw_date = req_dates[task_idx % len(req_dates)]
        elif not raw_date:
            p_date, _, _ = parse_task_datetime_from_text(
                task_data.get("title"), task_data.get("description"), week_start, user_request
            )
            if p_date:
                raw_date = p_date

        if (not raw_start or not raw_end) and req_start and req_end:
            raw_start = req_start
            raw_end = req_end
        elif not raw_start or not raw_end:
            _, p_start, p_end = parse_task_datetime_from_text(
                task_data.get("title"), task_data.get("description"), week_start, user_request
            )
            if p_start and p_end:
                raw_start = p_start
                raw_end = p_end

        if req_duration and not task_data.get("estimated_duration"):
            task_data["estimated_duration"] = req_duration

        eff_start, eff_end, conflict_warn = resolve_task_time_conflict(
            scheduled_date=raw_date,
            start_time=raw_start,
            end_time=raw_end,
            existing_tasks=existing_tasks,
        )

        if conflict_warn:
            warnings.append(conflict_warn)

        proposed = {
            "title": task_data.get("title", "Buổi học tập"),
            "description": task_data.get("description"),
            "topic": task_data.get("topic"),
            "what_to_study": task_data.get("what_to_study"),
            "what_to_do": task_data.get("what_to_do"),
            "reason": task_data.get("reason"),
            "material_id": task_data.get("material_id"),
            "material_title": task_data.get("material_title"),
            "course_id": task_data.get("course_id"),
            "course_name": task_data.get("course_name"),
            "goal_id": task_data.get("goal_id"),
            "goal_title": task_data.get("goal_title"),
            "scheduled_date": raw_date,
            "start_time": eff_start,
            "end_time": eff_end,
            "priority": normalize_priority(task_data.get("priority", "medium")),
            "estimated_duration": task_data.get("estimated_duration") or 90,
            "source_type": task_data.get("source_type", "AI_PLAN") or "AI_PLAN",
            "source_id": task_data.get("source_id"),
        }
        proposed_tasks.append(proposed)
        existing_tasks.append({
            "title": proposed["title"],
            "scheduled_date": raw_date,
            "start_time": eff_start,
            "end_time": eff_end,
        })

    return {
        "weekly_plan_id": None,
        "plan_title": decision.get("plan_title", f"Kế hoạch học tập {week_start}"),
        "summary": decision.get("summary", "Đã tạo xong dự thảo kế hoạch học tập tối ưu."),
        "proposed_tasks": proposed_tasks,
        "skipped_items": skipped_items,
        "warnings": warnings,
        "is_preview": True,
    }


async def generate_summary_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 4: Consolidate final PlannerAgent result state."""
    return {}

