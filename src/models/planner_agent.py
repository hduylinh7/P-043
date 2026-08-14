from pydantic import BaseModel, ConfigDict, Field


class PlannerAgentRequest(BaseModel):
    week_start: str | None = Field(
        default=None,
        description="Optional start date of planning period (YYYY-MM-DD).",
    )
    start_date: str | None = Field(
        default=None,
        description="Optional explicit start date of planning period (YYYY-MM-DD).",
    )
    end_date: str | None = Field(
        default=None,
        description="Optional explicit end date of planning period (YYYY-MM-DD).",
    )
    days: int | None = Field(
        default=None,
        description="Optional duration in days for the study plan.",
    )
    assignment_id: str | None = Field(
        default=None,
        description="Optional target assignment ID to generate a focused study roadmap.",
    )
    assignment_ids: list[str] | None = Field(
        default=None,
        description="Optional list of target assignment IDs to include in planning.",
    )
    request: str | None = Field(
        default="Tự động lập kế hoạch học tập tối ưu.",
        description="Student prompt, goals, or instructions for the Planner Agent.",
    )

    model_config = ConfigDict(from_attributes=True)


class PlannerTaskResult(BaseModel):
    id: str
    title: str
    scheduled_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    priority: str = "medium"
    source_type: str = "MANUAL"
    source_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PlannerAgentResponse(BaseModel):
    weekly_plan_id: str | None = Field(default=None, description="ID of created or updated Weekly Plan")
    week_start: str = Field(..., description="Start of planning week (YYYY-MM-DD)")
    week_end: str = Field(..., description="End of planning week (YYYY-MM-DD)")
    summary: str = Field(..., description="Agent summary of planned activities and trade-offs")
    created_tasks: list[PlannerTaskResult] = Field(default_factory=list)
    updated_tasks: list[PlannerTaskResult] = Field(default_factory=list)
    skipped_items: list[dict] = Field(default_factory=list, description="Items skipped or unscheduled due to workload")
    warnings: list[str] = Field(default_factory=list, description="Warnings or trade-off explanations")

    model_config = ConfigDict(from_attributes=True)
