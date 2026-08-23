import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Callable

from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.services.llm import get_llm
from src.services.student_context_service import StudentLearningContextService

logger = logging.getLogger(__name__)

CLASSIFIER_SYSTEM_PROMPT = """You are an intent classifier for a student assistant AI.
Categorize the user's input query into EXACTLY ONE of the following intent categories:
- "greeting": Friendly greetings, social small talk, asking who the assistant is.
- "assignment": Questions specifically about homework, assignments, submission status, due dates, deadlines.
- "course": Questions about enrolled courses, subject lists, or course materials.
- "score": Questions about grades, test scores, assignment marks, or teacher feedback.
- "goal": Questions about personal academic goals or study objectives.
- "schedule": Questions about daily/weekly schedules, what to do today/tomorrow, study plans, or timetables.
- "general": Complex, multi-part, or general learning advice queries that require complete student context.

Return ONLY a single valid JSON object with NO markdown formatting:
{"intent": "<category_name>"}
"""

COMPANION_SYSTEM_PROMPT = """
You are the student's Personal Learning Companion AI Assistant.

YOUR PURPOSE:
Understand and answer questions about the student's own learning situation based STRICTLY on real database context.

CURRENT DATETIME:
{current_datetime}

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
10. STRICT ACADEMIC INTEGRITY & SOCRATIC TUTORING:
   - SCOPE OF APPLICATION: This rule ONLY applies when the student explicitly asks to SOLVE or PROVIDE DIRECT ANSWERS for assigned assignment/quiz questions (e.g., "Give me the answer to question 1", "Choose A or B?", "Solve this assignment for me").
   - In those cases:
     + NEVER provide direct answers (e.g., DO NOT say "Choose option A", "The answer is B", "The result is 42", "The correct answer is...").
     + NEVER solve or complete assignments on behalf of the student.
     + INSTEAD (SOCRATIC TUTORING): Explain relevant theoretical concepts, suggest process-of-elimination reasoning steps, or ask guiding questions to help the student find the correct answer independently.
   - FOR ALL OTHER QUESTIONS:
     + Questions about courses, assigned work, due dates, scores, personal goals, weekly plan: Answer accurately and completely based strictly on actual context data.
     + Questions asking to explain concepts, lectures, materials, theory, expanding knowledge, learning methods, or friendly greetings/conversations: Always answer thoroughly, helpfully, clearly, and provide 100% maximum support.
11. SELF-CHECK UNDERSTANDING MODE:
   - When the student asks to test understanding (e.g., 'Test me on what I just learned', 'Đặt câu hỏi kiểm tra kiến thức', 'Hỏi tôi 5 câu để kiểm tra xem tôi hiểu chưa'):
   - Ask EXACTLY ONE question at a time.
   - DO NOT reveal the correct answer or full solution immediately in the same response. Wait for the student's answer first.
   - After the student responds, evaluate whether their answer is correct, provide a clear explanation with course material references, and ask the next question if appropriate.
12. Maintain a friendly, supportive, clear, and encouraging tone. Use Vietnamese if the user writes in Vietnamese, or English if the user writes in English.
13. CRITICAL LINK FORMATTING RULE:
   Whenever you mention any assignment or course, ALWAYS format them as Markdown links so the student can click directly on them to open details:
   - For an assignment: Format as `[Assignment Name](/courses/{{course_id}}?assignment={{id}})`
   - For a course: Format as `[Course Name](/courses/{{id}})`
   Use the exact `id` and `course_id` provided in the STUDENT ACADEMIC & LEARNING CONTEXT JSON.
14. MARKDOWN TABLE & LAYOUT FORMATTING RULE:
   - Format structured data (assignments, courses, deadlines, grades) using standard GitHub Flavored Markdown tables or bulleted lists.
   - ALWAYS put a blank newline BEFORE and AFTER any table.
   - Put each table row on its own line (`| Col 1 | Col 2 |`). NEVER use HTML tags like `<br>` or double pipes `||` inside tables.
"""


def is_greeting_query(query: str) -> bool:
    q = query.strip().lower()
    greetings = [
        "xin chào", "chào bạn", "chào em", "chào anh", "chào chị", "chào",
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "bạn là ai", "bạn tên gì", "who are you", "bạn có thể làm gì"
    ]
    if len(q.split()) <= 5:
        for g in greetings:
            if g in q:
                return True
    return False


async def classify_intent(query: str) -> str:
    """
    Classify user query intent using a lightweight LLM call (temperature=0.0).
    """
    try:
        llm = get_llm(temperature=0.0)
        messages = [
            SystemMessage(content=CLASSIFIER_SYSTEM_PROMPT),
            HumanMessage(content=query),
        ]
        response = await llm.ainvoke(messages)
        content_val = response.content if hasattr(response, "content") else str(response)
        if isinstance(content_val, list):
            texts = []
            for part in content_val:
                if isinstance(part, dict) and "text" in part:
                    texts.append(part["text"])
                elif isinstance(part, str):
                    texts.append(part)
                else:
                    texts.append(str(part))
            content_val = "".join(texts)

        clean_text = str(content_val).strip()
        if "```" in clean_text:
            clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r"\s*```$", "", clean_text)
            clean_text = clean_text.strip()

        data = json.loads(clean_text)
        intent = data.get("intent", "general").strip().lower()

        valid_intents = {"greeting", "assignment", "course", "score", "goal", "schedule", "general"}
        if intent not in valid_intents:
            intent = "general"

        logger.info(f"Classified intent: {intent!r} for query: {query!r}")
        return intent
    except Exception as e:
        logger.warning(f"Intent classification failed for query {query!r}: {e}. Defaulting to 'general'.")
        return "general"


INTENT_HANDLERS: dict[str, Callable] = {
    "assignment": StudentLearningContextService.get_assignments_context,
    "course": StudentLearningContextService.get_courses_context,
    "schedule": StudentLearningContextService.get_schedule_context,
    "score": StudentLearningContextService.get_scores_context,
    "goal": StudentLearningContextService.get_goals_context,
    "general": StudentLearningContextService.build_student_context,
}


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
        Execute the Personal Learning Companion agent workflow with LLM Intent Routing.
        """
        try:
            # 1. Fast-path check for simple greetings (no LLM call needed)
            if is_greeting_query(query):
                intent = "greeting"
                logger.info(f"Fast-path greeting matched for query: {query!r}")
                student_context = {
                    "student_info": {
                        "full_name": current_user.full_name,
                        "email": current_user.email,
                    }
                }
            else:
                # 2. LLM Intent Classification & Selective Context Retrieval via Handler Registry
                intent = await classify_intent(query)
                handler = INTENT_HANDLERS.get(intent, StudentLearningContextService.build_student_context)
                student_context = await handler(db=db, current_user=current_user)

            # Format context as compact JSON to save tokens and prevent TPM limit errors
            context_json_str = json.dumps(student_context, separators=(',', ':'), ensure_ascii=False)
            study_session_json_str = json.dumps(study_session_context or {}, separators=(',', ':'), ensure_ascii=False)

            # Current Date & Time string for temporal groundings
            now_utc = datetime.now(timezone.utc)
            current_datetime_str = f"{now_utc.strftime('%Y-%m-%d %H:%M:%S UTC')} ({now_utc.strftime('%A')})"

            # 3. Build system prompt
            system_prompt_content = COMPANION_SYSTEM_PROMPT.format(
                current_datetime=current_datetime_str,
                context_json=context_json_str,
                study_session_json=study_session_json_str,
            )

            # 4. Assemble message list
            messages: list[BaseMessage] = [SystemMessage(content=system_prompt_content)]

            # Include recent chat history if available
            if recent_messages:
                # Keep last 6 history messages to fit context window smoothly
                messages.extend(recent_messages[-6:])

            # Append current user query
            messages.append(HumanMessage(content=query))

            # 5. Invoke LLM
            llm = get_llm(temperature=0.3)
            response = await llm.ainvoke(messages)

            content_val = response.content if hasattr(response, "content") else str(response)
            if isinstance(content_val, list):
                texts = []
                for part in content_val:
                    if isinstance(part, dict) and "text" in part:
                        texts.append(part["text"])
                    elif isinstance(part, str):
                        texts.append(part)
                    else:
                        texts.append(str(part))
                response_text = "".join(texts)
            else:
                response_text = str(content_val)

            return {
                "response": response_text,
                "analysis": f"Personal Learning Companion Analysis (Intent: {intent})",
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
            elif "413" in err_str or "rate_limit_exceeded" in err_str.lower() or "tpm" in err_str.lower():
                user_friendly_msg = (
                    "Yêu cầu vượt quá giới hạn token theo phút (TPM) của LLM provider (Groq API Rate Limit).\n"
                    "👉 Hệ thống đã tự động tối ưu hóa và thu gọn dữ liệu ngữ cảnh. Bạn hãy thử gửi lại câu hỏi!"
                )
            else:
                user_friendly_msg = err_str

            return {
                "response": f"Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi: {user_friendly_msg}",
                "analysis": "Error during context processing",
                "citations": [],
                "sources": [],
            }

