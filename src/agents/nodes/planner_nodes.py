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
You are an expert AI Student Study Planner.

YOUR OBJECTIVE:
Analyze the student's workload, goals, assignments, personal tasks, and current schedule, then create a realistic, balanced weekly study plan.

ACADEMIC INTEGRITY RULES:
1. You are a PLANNING assistant only. You MUST NOT complete, write, or solve graded assignments directly.
2. If the user asks you to "do my assignment" or "write my code", convert the request into study and preparation tasks (e.g., "Read assignment prompt", "Research concepts", "Draft solution", "Test code").

CRITICAL EXPLICIT DATE & TIME CONSTRAINTS (STRICTLY ENFORCED):
1. READ TITLES, DESCRIPTIONS, AND USER REQUESTS CAREFULLY FOR TIME/DAY MENTIONS:
   If a task title, description, or student request specifies an explicit day of the week (e.g., "thứ 6", "thứ sáu", "thứ 2", "cuối tuần", "Saturday", "Friday") or an explicit time slot / period (e.g., "lúc 20h", "20:00", "buổi tối", "buổi chiều", "buổi sáng"):
   - You MUST schedule that task on that EXACT requested day of the week and time period!
   - Relative Mapping: "cuối tuần" / "weekend" = Saturday or Sunday. "buổi tối" = 20:00 - 21:30. "buổi chiều" = 14:00 - 15:30. "buổi sáng" = 09:00 - 10:30.
   - Example: Task "Đi xem phim" with description "đi xem phim vào cuối tuần... muốn đi vào buổi tối" MUST be scheduled on Saturday ({week_start} + 5 days) at 20:00 - 21:30!
2. WEEKDAY DATE MAPPING FOR THIS PLANNING PERIOD ({week_start} to {week_end}):
{weekday_mapping}

SCHEDULING & PRIORITY RULES:
1. URGENT ASSIGNMENTS DUE SOON come first. Never schedule a task AFTER its assignment's due date.
2. Respect explicit day/time preferences in task titles/descriptions before distributing unconstrained tasks.
3. Break large tasks (e.g. > 2 hours) into smaller, manageable daily sessions across the week.
4. Distribute unconstrained tasks across Monday to Sunday of the planning period ({week_start} to {week_end}).
5. Ensure start_time is before end_time (e.g. "19:00" to "21:00").
6. Do NOT overload a single day (max 3-4 intensive study tasks per day).
7. priority MUST be strictly one of: "low", "medium", "high", "urgent" (do NOT use "critical" or other strings).
8. NO TIME OVERLAPS / CONFLICTS: Tasks scheduled on the same date MUST NOT overlap in time slots. Ensure their time ranges do not intersect (e.g. Task 1: 08:00 - 10:00, Task 2: 10:00 - 12:00, Task 3: 14:00 - 16:00).
9. If total workload exceeds available time, prioritize key items and list skipped items with explanations in warnings/skipped_items.

OUTPUT FORMAT:
Respond strictly with a valid JSON object formatted as follows:
{{
  "plan_title": "Kế hoạch tuần {week_start}",
  "summary": "Tóm tắt ngắn gọn kế hoạch...",
  "warnings": ["Cảnh báo nếu khối lượng công việc quá nặng..."],
  "skipped_items": [{{"title": "Mục bị hoãn", "reason": "Lý do..."}}],
  "tasks": [
    {{
      "title": "Tên nhiệm vụ",
      "description": "Mô tả chi tiết...",
      "scheduled_date": "YYYY-MM-DD",
      "start_time": "19:00",
      "end_time": "21:00",
      "priority": "high",
      "estimated_duration": 120,
      "source_type": "ASSIGNMENT",
      "source_id": "optional_id"
    }}
  ]
}}
"""


async def load_context_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 1: Load student's Planner Context via PlannerTools."""
    db = state["db"]
    current_user = state["current_user"]
    week_start = state.get("week_start")

    try:
        context = await PlannerTools.get_planner_context(db, current_user, week_start=week_start)
        return {
            "context": context,
            "week_start": context.planning_period.week_start,
        }
    except Exception as e:
        logger.error(f"Error loading planner context: {e}")
        return {"error": f"Failed to load planner context: {e}"}


async def analyze_and_decide_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 2: Prompt LLM to analyze context and return structured planning decision."""
    if state.get("error"):
        return {}

    context = state["context"]
    user_request = state.get("user_request", "Tự động lập kế hoạch học tập tối ưu cho tuần này.")

    # Context formatting for prompt
    context_dict = context.model_dump() if hasattr(context, "model_dump") else context
    week_start = context_dict.get("planning_period", {}).get("week_start", state.get("week_start"))
    week_end = context_dict.get("planning_period", {}).get("week_end")

    start_dt = datetime.strptime(week_start, "%Y-%m-%d").date()
    days_names = ["Monday (Thứ Hai)", "Tuesday (Thứ Ba)", "Wednesday (Thứ Tư)", "Thursday (Thứ Năm)", "Friday (Thứ Sáu)", "Saturday (Thứ Bảy)", "Sunday (Chủ Nhật)"]
    mapping_str = "\n".join([f"- {days_names[i]}: {(start_dt + timedelta(days=i)).strftime('%Y-%m-%d')}" for i in range(7)])

    system_prompt = PLANNER_SYSTEM_PROMPT.format(
        week_start=week_start,
        week_end=week_end,
        weekday_mapping=mapping_str,
    )

    user_msg_content = f"""
STUDENT REQUEST:
{user_request}

PLANNER CONTEXT:
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

    # Map items from context into fallback tasks
    curr_date = datetime.strptime(week_start, "%Y-%m-%d").date()

    for idx, ass in enumerate(context_dict.get("assignments", [])):
        target_day = curr_date + timedelta(days=idx % 5)  # Mon-Fri
        tasks.append({
            "title": f"Học & Làm {ass.get('title')}",
            "description": f"Bài tập môn {ass.get('course_name', '')}",
            "scheduled_date": target_day.strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "priority": normalize_priority(ass.get("priority", "high")),
            "estimated_duration": 120,
            "source_type": "ASSIGNMENT",
            "source_id": ass.get("id"),
        })

    for idx, ptask in enumerate(context_dict.get("personal_tasks", [])):
        p_title = ptask.get("title", "")
        p_desc = ptask.get("description", "")
        parsed_date, parsed_start, parsed_end = parse_task_datetime_from_text(p_title, p_desc, week_start)

        target_day_str = parsed_date or (curr_date + timedelta(days=(idx + 2) % 7)).strftime("%Y-%m-%d")
        start_time_str = parsed_start or "14:00"
        end_time_str = parsed_end or "15:30"

        tasks.append({
            "title": p_title,
            "description": p_desc,
            "scheduled_date": target_day_str,
            "start_time": start_time_str,
            "end_time": end_time_str,
            "priority": normalize_priority(ptask.get("priority", "medium")),
            "estimated_duration": ptask.get("estimated_duration") or 90,
            "source_type": "PERSONAL_TASK",
            "source_id": ptask.get("id"),
        })

    return {
        "plan_title": f"Kế hoạch tuần {week_start}",
        "summary": "Đã tự động lập kế hoạch tuần dựa trên danh sách bài tập và nhiệm vụ cá nhân.",
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
    decision = state.get("plan_decision", {})

    created_tasks = []
    updated_tasks = []
    skipped_items = list(decision.get("skipped_items", []))
    warnings = list(decision.get("warnings", []))

    # 1. Fetch or create Weekly Plan
    try:
        plan = await PlannerTools.get_current_weekly_plan(db, current_user, week_start=week_start)
        if not plan:
            plan_title = decision.get("plan_title", f"Kế hoạch tuần {week_start}")
            plan = await PlannerTools.create_weekly_plan(
                db, current_user, week_start=week_start, title=plan_title
            )

        weekly_plan_id = plan.id
    except Exception as e:
        logger.error(f"Failed to get/create weekly plan in agent execution: {e}")
        return {
            "error": f"Failed to handle weekly plan: {e}",
            "weekly_plan_id": None,
            "created_tasks": [],
            "updated_tasks": [],
            "skipped_items": skipped_items,
            "warnings": [f"Lỗi tạo kế hoạch tuần: {e}"],
        }

    # 2. Track existing & newly scheduled tasks to avoid conflicts
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
    except Exception as e:
        logger.warning(f"Could not load existing tasks for conflict checking: {e}")

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
                title=task_data.get("title", "Nhiệm vụ mới"),
                description=task_data.get("description"),
                scheduled_date=raw_date,
                start_time=eff_start,
                end_time=eff_end,
                priority=normalize_priority(task_data.get("priority", "medium")),
                estimated_duration=task_data.get("estimated_duration"),
                source_type=task_data.get("source_type", "MANUAL"),
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
        "summary": decision.get("summary", "Đã tạo thành công kế hoạch tuần."),
    }


async def generate_summary_node(state: PlannerAgentState) -> dict[str, Any]:
    """Node 4: Consolidate final PlannerAgent result state."""
    return {}
