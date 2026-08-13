import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.services.llm import get_llm
from src.services.student_context_service import StudentLearningContextService

logger = logging.getLogger(__name__)

COMPANION_SYSTEM_PROMPT = """
You are the student's Personal Learning Companion AI Assistant.

YOUR PURPOSE:
Understand and answer questions about the student's own learning situation based STRICTLY on real database context.

STUDENT ACADEMIC & LEARNING CONTEXT:
{context_json}

RULES & GUIDELINES:
1. Ground every factual answer in the actual student learning context provided above.
2. If asked about enrolled courses (e.g. "What courses am I taking?"), list the student's actual enrolled courses with course code and name.
3. If asked about assignments or deadlines (e.g. "What assignments do I have?", "What assignments are due soon?", "Which assignments have I submitted/not submitted?"), list the actual assignments with their due dates, course name, and submission status.
4. If asked about scores/grades (e.g. "What scores have I received?", "How am I doing?"), retrieve the actual scores and feedback received. If there is insufficient data or no graded assignments exist, explain that clearly without inventing fake grades.
5. If asked about personal goals, summarize their actual active goals.
6. If asked about weekly plan, summarize their current week's plan and tasks if available.
7. If asked for recommendations on what to prioritize or focus on:
   - Analyze upcoming assignment deadlines, submission status (unsubmitted vs submitted), estimated hours, and personal goals.
   - Recommend the most urgent unsubmitted assignment due soon or directly matching their active goals.
   - Clearly distinguish retrieved facts from your AI recommendations.
8. NEVER invent courses, assignments, deadlines, scores, or goals that do not exist in the context.
9. DO NOT search for, reference, or create Personal Tasks (Personal Tasks feature has been removed).
10. DO NOT attempt to do or solve homework/assignments directly; act as a study advisor and companion.
11. Maintain a friendly, supportive, clear, and encouraging tone. Use Vietnamese if the user writes in Vietnamese, or English if the user writes in English.
"""


class PersonalLearningCompanionAgent:
    """
    AI Agent that serves as the Personal Learning Companion on the main/home screen.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        query: str,
        recent_messages: list[BaseMessage] | None = None,
    ) -> dict[str, Any]:
        """
        Execute the Personal Learning Companion agent workflow.
        """
        try:
            # 1. Retrieve authenticated student's full learning context from DB
            student_context = await StudentLearningContextService.build_student_context(
                db=db, current_user=current_user
            )

            # Format context as pretty JSON
            context_json_str = json.dumps(student_context, indent=2, ensure_ascii=False)

            # 2. Build system prompt
            system_prompt_content = COMPANION_SYSTEM_PROMPT.format(context_json=context_json_str)

            # 3. Assemble message list
            messages: list[BaseMessage] = [SystemMessage(content=system_prompt_content)]

            # Include recent chat history if available
            if recent_messages:
                # Keep last 6 history messages to fit context window smoothly
                messages.extend(recent_messages[-6:])

            # Append current user query
            messages.append(HumanMessage(content=query))

            # 4. Invoke LLM
            llm = get_llm(temperature=0.3)
            response = await llm.ainvoke(messages)

            response_text = (
                response.content if hasattr(response, "content") else str(response)
            )

            return {
                "response": response_text,
                "analysis": "Personal Learning Companion Context Analysis",
                "citations": [],
                "sources": [],
            }
        except Exception as e:
            logger.error(f"Error in PersonalLearningCompanionAgent: {e}", exc_info=True)
            return {
                "response": f"Xin lỗi, tôi gặp sự cố khi đọc dữ liệu học tập của bạn: {e}",
                "analysis": "Error during context processing",
                "citations": [],
                "sources": [],
            }
