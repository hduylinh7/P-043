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
    auto_apply: bool = Field(
        default=False,
        description="If True, automatically save generated tasks to DB. If False (default), return as preview/draft.",
    )

    model_config = ConfigDict(from_attributes=True)


class PlannerTaskResult(BaseModel):
    id: str | None = None
    title: str
    description: str | None = None
    topic: str | None = None
    what_to_study: list[str] | None = None
    what_to_do: list[str] | None = None
    reason: str | None = None
    scheduled_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    priority: str = "medium"
    estimated_duration: int | None = None
    source_type: str = "MANUAL"
    source_id: str | None = None
    course_id: str | None = None
    course_name: str | None = None
    material_id: str | None = None
    material_title: str | None = None
    goal_id: str | None = None
    goal_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PlannerProposedTask(BaseModel):
    id: str | None = None
    title: str
    description: str | None = None
    topic: str | None = None
    what_to_study: list[str] | None = None
    what_to_do: list[str] | None = None
    reason: str | None = None
    scheduled_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    priority: str = "medium"
    estimated_duration: int | None = None
    source_type: str = "MANUAL"
    source_id: str | None = None
    course_id: str | None = None
    course_name: str | None = None
    material_id: str | None = None
    material_title: str | None = None
    goal_id: str | None = None
    goal_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PlannerApplyRequest(BaseModel):
    week_start: str = Field(..., description="Start of planning week (YYYY-MM-DD)")
    week_end: str | None = Field(default=None, description="End of planning week (YYYY-MM-DD)")
    plan_title: str | None = Field(default=None, description="Title of weekly plan")
    summary: str | None = Field(default=None, description="Summary of weekly plan")
    tasks: list[PlannerProposedTask] = Field(default_factory=list, description="Approved list of tasks to save")

    model_config = ConfigDict(from_attributes=True)


class PlannerAgentResponse(BaseModel):
    weekly_plan_id: str | None = Field(default=None, description="ID of created or updated Weekly Plan")
    week_start: str = Field(..., description="Start of planning week (YYYY-MM-DD)")
    week_end: str = Field(..., description="End of planning week (YYYY-MM-DD)")
    summary: str = Field(..., description="Agent summary of planned activities and trade-offs")
    plan_title: str | None = Field(default=None, description="Generated plan title")
    is_preview: bool = Field(default=False, description="True if response is draft preview not yet saved to DB")
    created_tasks: list[PlannerTaskResult] = Field(default_factory=list)
    updated_tasks: list[PlannerTaskResult] = Field(default_factory=list)
    proposed_tasks: list[PlannerProposedTask] = Field(default_factory=list)
    skipped_items: list[dict] = Field(default_factory=list, description="Items skipped or unscheduled due to workload")
    warnings: list[str] = Field(default_factory=list, description="Warnings or trade-off explanations")

    model_config = ConfigDict(from_attributes=True)

