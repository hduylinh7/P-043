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

ACTIVE STUDY SESSION CONTEXT:
{study_session_json}

RULES & GUIDELINES:
1. Ground every factual answer in the actual student learning context provided above.
2. If asked about enrolled courses (e.g. "What courses am I taking?"), list the student's actual enrolled courses with course code and name.
3. If asked about assignments or deadlines (e.g. "What assignments do I have?", "What assignments are due soon?", "Which assignments have I submitted/not submitted?"), list the actual assignments with their due dates, course name, and submission status.
4. If asked about scores/grades (e.g. "What scores have I received?", "How am I doing?"), retrieve the actual scores and feedback received. If there is insufficient data or no graded assignments exist, explain that clearly without inventing fake grades.
5. If asked about personal goals, summarize their actual active goals.
6. If asked about weekly plan or active study session, refer to the active study session topic, what to study, and what to do.
7. If asked for recommendations on what to prioritize or focus on:
   - Analyze upcoming assignment deadlines, submission status (unsubmitted vs submitted), estimated hours, and personal goals.
   - Recommend the most urgent unsubmitted assignment due soon or directly matching their active goals.
   - Clearly distinguish retrieved facts from your AI recommendations.
8. NEVER invent courses, assignments, deadlines, scores, or goals that do not exist in the context.
9. DO NOT search for, reference, or create Personal Tasks (Personal Tasks feature has been removed).
10. ACADEMIC INTEGRITY RULE:
   - DO NOT complete or provide direct, final answers to graded assignments or homework.
   - If the student asks for direct answers (e.g., "Give me the answer to this graded assignment"), explain the underlying concept, provide helpful hints, ask guiding questions, help the student reason through the problem step-by-step, or provide similar worked examples.
11. SELF-CHECK UNDERSTANDING MODE:
   - When the student asks to test understanding (e.g., 'Test me on what I just learned', 'Đặt câu hỏi kiểm tra kiến thức', 'Hỏi tôi 5 câu để kiểm tra xem tôi hiểu chưa'):
   - Ask EXACTLY ONE question at a time.
   - DO NOT reveal the correct answer or full solution immediately in the same response. Wait for the student's answer first.
   - After the student responds, evaluate whether their answer is correct, provide a clear explanation with course material references, and ask the next question if appropriate.
12. Maintain a friendly, supportive, clear, and encouraging tone. Use Vietnamese if the user writes in Vietnamese, or English if the user writes in English.
13. CRITICAL LINK FORMATTING RULE:
   Whenever you mention any assignment or course, ALWAYS format them as Markdown links so the student can click directly on them to open details:
   - For an assignment: Format as `[Tên bài tập](/courses/{{course_id}}?assignment={{id}})`
   - For a course: Format as `[Tên khóa học](/courses/{{id}})`
   Use the exact `id` and `course_id` provided in the STUDENT ACADEMIC & LEARNING CONTEXT JSON.
"""


class PersonalLearningCompanionAgent:
    """
    AI Agent that serves as the Personal Learning Companion on the main/home screen and study sessions.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        query: str,
        recent_messages: list[BaseMessage] | None = None,
        study_session_context: dict[str, Any] | None = None,
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
            study_session_json_str = json.dumps(study_session_context or {}, indent=2, ensure_ascii=False)

            # 2. Build system prompt
            system_prompt_content = COMPANION_SYSTEM_PROMPT.format(
                context_json=context_json_str,
                study_session_json=study_session_json_str,
            )

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
            err_str = str(e)
            if "invalid_api_key" in err_str.lower() or "401" in err_str or "Invalid API Key" in err_str:
                user_friendly_msg = (
                    "GROQ_API_KEY chưa hợp lệ hoặc chưa được điền trong file .env!\n"
                    "👉 Bạn hãy truy cập https://console.groq.com/keys để tạo API Key miễn phí, sau đó dán vào file .env:\n"
                    "GROQ_API_KEY=gsk_..."
                )
            else:
                user_friendly_msg = err_str

            return {
                "response": f"Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi: {user_friendly_msg}",
                "analysis": "Error during context processing",
                "citations": [],
                "sources": [],
            }
