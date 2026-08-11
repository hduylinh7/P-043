import json
import logging
from datetime import datetime, timedelta
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from src.agents.planner_state import PlannerAgentState
from src.agents.tools.planner_tools import PlannerTools
from src.services.llm import get_llm

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = """
You are an expert AI Student Study Planner.

YOUR OBJECTIVE:
Analyze the student's workload, goals, assignments, personal tasks, and current schedule, then create a realistic, balanced weekly study plan.

ACADEMIC INTEGRITY RULES:
1. You are a PLANNING assistant only. You MUST NOT complete, write, or solve graded assignments directly.
2. If the user asks you to "do my assignment" or "write my code", convert the request into study and preparation tasks (e.g., "Read assignment prompt", "Research concepts", "Draft solution", "Test code").

SCHEDULING & PRIORITY RULES:
1. URGENT ASSIGNMENTS DUE SOON come first. Never schedule a task AFTER its assignment's due date.
2. Break large tasks (e.g. > 2 hours) into smaller, manageable daily sessions across the week.
3. Distribute tasks across Monday to Sunday of the planning period ({week_start} to {week_end}).
4. Ensure start_time is before end_time (e.g. "19:00" to "21:00").
5. Do NOT overload a single day (max 3-4 intensive study tasks per day).
6. If total workload exceeds available time, prioritize key items and list skipped items with explanations in warnings/skipped_items.

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

    system_prompt = PLANNER_SYSTEM_PROMPT.format(week_start=week_start, week_end=week_end)

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
            "priority": ass.get("priority", "high").lower(),
            "estimated_duration": 120,
            "source_type": "ASSIGNMENT",
            "source_id": ass.get("id"),
        })

    for idx, ptask in enumerate(context_dict.get("personal_tasks", [])):
        target_day = curr_date + timedelta(days=(idx + 2) % 7)
        tasks.append({
            "title": ptask.get("title"),
            "description": ptask.get("description"),
            "scheduled_date": target_day.strftime("%Y-%m-%d"),
            "start_time": "14:00",
            "end_time": "15:30",
            "priority": ptask.get("priority", "medium").lower(),
            "estimated_duration": 90,
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

    # 2. Iterate and create tasks using PlannerTools
    for task_data in decision.get("tasks", []):
        try:
            task_res = await PlannerTools.create_plan_task(
                db=db,
                current_user=current_user,
                weekly_plan_id=weekly_plan_id,
                title=task_data.get("title", "Nhiệm vụ mới"),
                description=task_data.get("description"),
                scheduled_date=task_data.get("scheduled_date"),
                start_time=task_data.get("start_time"),
                end_time=task_data.get("end_time"),
                priority=task_data.get("priority", "medium"),
                estimated_duration=task_data.get("estimated_duration"),
                source_type=task_data.get("source_type", "MANUAL"),
                source_id=task_data.get("source_id"),
            )
            created_tasks.append(task_res.model_dump())
        except Exception as e:
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
