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
    "thứ 2": 0, "thứ hai": 0, "mon": 0, "monday": 0, "t2": 0,
    "thứ 3": 1, "thứ ba": 1, "tue": 1, "tuesday": 1, "t3": 1,
    "thứ 4": 2, "thứ tư": 2, "wed": 2, "wednesday": 2, "t4": 2,
    "thứ 5": 3, "thứ năm": 3, "thu": 3, "thursday": 3, "t5": 3,
    "thứ 6": 4, "thứ sáu": 4, "fri": 4, "friday": 4, "t6": 4,
    "thứ 7": 5, "thứ bảy": 5, "sat": 5, "saturday": 5, "t7": 5,
    "chủ nhật": 6, "cn": 6, "sun": 6, "sunday": 6,
    "cuối tuần": 5, "weekend": 5,
    "đầu tuần": 0,
    "giữa tuần": 2,
}


def parse_task_datetime_from_text(
    title: str | None,
    description: str | None,
    week_start_str: str,
) -> tuple[str | None, str | None, str | None]:
    """
    Parse task title and description for explicit/relative weekday and start/end time hints.
    Returns (scheduled_date, start_time, end_time).
    """
    text = f"{title or ''} {description or ''}".lower()
    if not text.strip():
        return None, None, None

    try:
        start_date = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    except Exception:
        return None, None, None

    target_date_str = None
    target_start_time = None
    target_end_time = None

    # 1. Match Weekday (e.g. "thứ 6", "thứ sáu", "cuối tuần", "weekend")
    for pattern, day_idx in WEEKDAY_MAP.items():
        if re.search(r'(?:\b|_)' + re.escape(pattern) + r'(?:\b|_)', text):
            target_day = start_date + timedelta(days=day_idx)
            target_date_str = target_day.strftime("%Y-%m-%d")
            break

    # 2. Match Explicit Start Time (e.g. "20h", "20:00", "20h30", "8h tối", "8pm", "8h")
    explicit_time = re.search(r'(\d{1,2})\s*(?:h|:(\d{2})|giờ|pm)', text)
    if explicit_time:
        try:
            h_val = int(explicit_time.group(1))
            m_val = int(explicit_time.group(2)) if explicit_time.group(2) else 0
            if ("tối" in text or "pm" in text) and h_val < 12:
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

    # 3. Fallback to Period of Day if no explicit digits were found (e.g. "buổi tối", "tối", "chiều", "sáng", "trưa")
    if target_start_time is None:
        if re.search(r'\b(?:buổi\s*)?tối\b', text) or "evening" in text or "night" in text:
            target_start_time = "20:00"
            target_end_time = "21:30"
        elif re.search(r'\b(?:buổi\s*)?chiều\b', text) or "afternoon" in text:
            target_start_time = "14:00"
            target_end_time = "15:30"
        elif re.search(r'\b(?:buổi\s*)?trưa\b', text) or "noon" in text or "lunch" in text:
            target_start_time = "12:00"
            target_end_time = "13:00"
        elif re.search(r'\b(?:buổi\s*)?sáng\b', text) or "morning" in text:
            target_start_time = "09:00"
            target_end_time = "10:30"

    return target_date_str, target_start_time, target_end_time


PLANNER_SYSTEM_PROMPT = """
You are an expert AI Student Study Planner for the Learning Companion.

YOUR OBJECTIVE:
Analyze the student's personal goals, enrolled courses, upcoming assignments, available course materials, and schedule, then generate a realistic, structured Study Plan.

CRITICAL COURSE MATERIAL & ASSIGNMENT GROUNDING & NO-HALLUCINATION RULES:
1. When recommending a study topic, inspect the provided `assignments` and `course_materials` list in the context.
2. Each assignment contains real questions, checklists, and embedded specification chunks from uploaded files. Study sessions generated for an assignment MUST be strictly grounded in these real assignment questions, checklists, and embedded specification chunks.
3. If a matching real course material exists for the topic, include its exact `material_id` and `material_title`.
4. If NO matching course material can be found in `course_materials`, set `material_id: null` and `material_title: "No matching course material was found."`.
5. NEVER invent or hallucinate fake lecture titles, book chapters, resource URLs, assignment requirements, or course materials that do not exist in the context!

STUDY SESSION DETAIL REQUIREMENTS:
For EACH study session, provide:
- `title`: Short title (e.g., "Random Forest Review")
- `topic`: Topic name (e.g., "Random Forest")
- `what_to_study`: List of specific concepts/items to review
- `what_to_do`: Step-by-step actionable activities
- `reason`: Clear explanation of why this session is recommended (e.g., upcoming deadline, supporting personal goal)
- `course_id`: Real course ID from context
- `course_name`: Course name
- `material_id`: Matching material ID or null
- `material_title`: Matching material title or "No matching course material was found."
- `assignment_id`: Related assignment ID or null
- `assignment_title`: Related assignment title or null
- `goal_id`: Related Personal Goal ID or null
- `goal_title`: Related Personal Goal title or null

ACADEMIC INTEGRITY RULES:
1. You are a PLANNING assistant only. You MUST NOT complete, write, or solve graded assignments directly.
2. If the user asks to "do my assignment", convert it into study and preparation sessions (e.g. "Review requirements", "Study lecture material", "Draft solution", "Self-test").

DATE & TIME CONSTRAINTS:
1. FIXED UNIVERSITY CLASS SCHEDULES ARE IMMUTABLE HARD CONSTRAINTS. NEVER generate or schedule an AI Study Session during hours occupied by a fixed university class lecture! Choose free open hours (e.g. evening 19:00 - 20:30).
2. ASSIGNMENT DUE DATES: When scheduling study sessions for an assignment, set `scheduled_date` to its exact due date (`due_date`) or 1 day BEFORE its due date. Do NOT schedule sessions AFTER the due date!
3. Respect Course start_date and end_date. Do NOT create study sessions before a course starts or after it ends.
4. Check explicit day/time preferences in student request or assignment deadlines.
5. Weekday Date Mapping ({week_start} to {week_end}):
{weekday_mapping}
6. priority MUST be strictly one of: "low", "medium", "high", "urgent".
7. Ensure start_time < end_time (e.g. "19:00" to "20:30").
8. Do NOT overlap sessions on the same day.

OUTPUT FORMAT:
Respond strictly with a valid JSON object formatted as follows:
{{
  "plan_title": "Kế hoạch học tập ({week_start} đến {week_end})",
  "summary": "Tóm tắt ngắn gọn mục tiêu và định hướng kế hoạch...",
  "warnings": ["Cảnh báo hoặc lưu ý..."],
  "skipped_items": [{{"title": "Mục hoãn", "reason": "Lý do..."}}],
  "tasks": [
    {{
      "title": "Random Forest Fundamentals",
      "topic": "Random Forest",
      "what_to_study": ["Decision Tree fundamentals", "Random Forest concept", "Ensemble learning"],
      "what_to_do": [
        "1. Ôn lại bài giảng liên quan",
        "2. Xem các ví dụ minh họa",
        "3. Tóm tắt sự khác biệt giữa Decision Tree và Random Forest"
      ],
      "reason": "Bài tập 'Classification Model' sắp tới hạn (19 Aug) và yêu cầu hiểu rõ Random Forest. Hỗ trợ mục tiêu 'Nâng cao Machine Learning'.",
      "course_id": "course_uuid",
      "course_name": "Machine Learning",
      "material_id": "material_uuid_or_null",
      "material_title": "Lecture 05 — Random Forest",
      "assignment_id": "assignment_uuid_or_null",
      "assignment_title": "Classification Model",
      "goal_id": "goal_uuid_or_null",
      "goal_title": "Nâng cao Machine Learning",
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
{user_request}

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
        return {"plan_decision": decision}
    except Exception as e:
        logger.warning(f"LLM JSON parsing fallback: {e}")
        # Fallback decision if LLM call fails or returns non-JSON
        fallback_decision = create_fallback_decision(context_dict, week_start, user_request)
        return {"plan_decision": fallback_decision}


def create_fallback_decision(context_dict: dict[str, Any], week_start: str, user_request: str) -> dict[str, Any]:
    """Fallback planner decision when LLM returns unstructured output."""
    tasks = []
    skipped = []

    curr_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    materials = context_dict.get("course_materials", [])

    for idx, ass in enumerate(context_dict.get("assignments", [])):
        due_str = ass.get("due_date")
        if due_str:
            try:
                target_day = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").date()
            except Exception:
                target_day = curr_date + timedelta(days=idx % 5)
        else:
            target_day = curr_date + timedelta(days=idx % 5)

        matched_mat = next((m for m in materials if m.get("course_id") == ass.get("course_id")), None)
        mat_id = matched_mat.get("id") if matched_mat else None
        mat_title = matched_mat.get("title") if matched_mat else "No matching course material was found."

        tasks.append({
            "title": f"Ôn tập & Chuẩn bị: {ass.get('title')}",
            "topic": ass.get("title"),
            "what_to_study": ["Xem lại kiến thức môn học", "Đọc yêu cầu bài tập"],
            "what_to_do": ["1. Xem lại bài giảng liên quan", "2. Thực hành kiến thức", "3. Hoàn thành bài tập"],
            "reason": f"Bài tập môn {ass.get('course_name', '')} sắp tới hạn ({ass.get('due_date', 'N/A')}).",
            "course_id": ass.get("course_id"),
            "course_name": ass.get("course_name"),
            "material_id": mat_id,
            "material_title": mat_title,
            "assignment_id": ass.get("id"),
            "assignment_title": ass.get("title"),
            "scheduled_date": target_day.strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "20:30",
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

    for task_data in decision.get("tasks", []):
        raw_date = task_data.get("scheduled_date")
        raw_start = task_data.get("start_time")
        raw_end = task_data.get("end_time")

        # Check if title/description contains explicit weekday or start_time
        p_date, p_start, p_end = parse_task_datetime_from_text(
            task_data.get("title"), task_data.get("description"), week_start
        )
        if p_date:
            raw_date = p_date
        if p_start and p_end:
            raw_start = p_start
            raw_end = p_end

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


async def generate_summary_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 4: Consolidate final PlannerAgent result state."""
    return {}
