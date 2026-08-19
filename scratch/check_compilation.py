import sys
import os

sys.path.insert(0, os.path.abspath("."))

try:
    from src.models.weekly_plan import (
        StudySessionCompanionResponse,
        SelfCheckEvalRequest,
        SelfCheckEvalResponse,
        PlanTaskResponse,
    )
    print("[OK] src.models.weekly_plan compiled and imported successfully.")

    from src.services.weekly_plan_service import WeeklyPlanService
    print("[OK] src.services.weekly_plan_service compiled and imported successfully.")

    from src.services.student_context_service import StudentLearningContextService
    print("[OK] src.services.student_context_service compiled and imported successfully.")

    from src.routers.weekly_plan_router import router as weekly_plan_router
    print("[OK] src.routers.weekly_plan_router compiled and imported successfully.")

    from src.agents.companion_agent import PersonalLearningCompanionAgent
    print("[OK] src.agents.companion_agent compiled and imported successfully.")

    print("SUCCESS: ALL BACKEND MODULES COMPILED CLEANLY!")
except Exception as e:
    print(f"ERROR: COMPILATION ERROR: {e}")
    sys.exit(1)
