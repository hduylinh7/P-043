from pydantic import BaseModel, ConfigDict, Field


class PlannerAgentRequest(BaseModel):
    week_start: str | None = Field(
        default=None,
        description="Optional start date of weekly plan (YYYY-MM-DD). Defaults to current week Monday.",
    )
    request: str | None = Field(
        default="Tự động lập kế hoạch học tập tối ưu cho tuần này.",
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
