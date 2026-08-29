import pytest

from src.models.planner_agent import PlannerTaskResult


def test_planner_task_result_defaults_to_ai_plan():
    res = PlannerTaskResult(
        id="t1",
        title="Test AI Task",
    )
    assert res.source_type == "AI_PLAN"
