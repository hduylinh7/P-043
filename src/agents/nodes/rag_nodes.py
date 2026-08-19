import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from src.agents.state import AgentState
from src.services.llm import get_llm
from src.services.rag_service import RAGService

logger = logging.getLogger(__name__)


async def retrieve_context_node(state: AgentState) -> dict[str, Any]:
    """Retrieve relevant course material chunks from vector database."""
    query = state.get("query", "")
    course_id = state.get("course_id")
    material_id = state.get("material_id")
    assignment_id = state.get("assignment_id")
    messages = state.get("messages", [])

    study_session_ctx = state.get("study_session_context")
    if isinstance(study_session_ctx, dict):
        if not material_id and study_session_ctx.get("material_id"):
            material_id = study_session_ctx.get("material_id")
        if not course_id and study_session_ctx.get("course_id"):
            course_id = study_session_ctx.get("course_id")
        if not assignment_id and study_session_ctx.get("assignment_id"):
            assignment_id = study_session_ctx.get("assignment_id")

    if not query and messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "content"):
            query = str(last_msg.content)

    if not query:
        return {
            "retrieved_docs": [],
            "context_text": "No query provided.",
            "citations": [],
            "analysis": "No user query provided for retrieval.",
        }

    try:
        retrieved = RAGService.search_course_materials(
            course_id=course_id,
            query=query,
            material_id=material_id,
            assignment_id=assignment_id,
        )
    except Exception as e:
        logger.error(f"Error during RAG context retrieval: {e}")
        retrieved = []

    citations = []
    formatted_chunks = []
    seen_sources = set()

    for idx, item in enumerate(retrieved, start=1):
        content = item.get("content", "")
        meta = item.get("metadata", {})
        file_name = meta.get("file_name", "Unknown File")
        material_id = meta.get("material_id", "")
        chunk_idx = meta.get("chunk_index", "")

        citation_entry = {
            "file_name": file_name,
            "material_id": material_id,
            "chunk_index": chunk_idx,
            "score": item.get("score", 0.0),
        }
        citations.append(citation_entry)
        seen_sources.add(file_name)

        formatted_chunks.append(
            f"--- Context Chunk {idx} [Source: {file_name} (Chunk #{chunk_idx})] ---\n{content}"
        )

    if formatted_chunks:
        context_text = "\n\n".join(formatted_chunks)
        analysis = (
            f"Retrieved {len(retrieved)} relevant document chunks from "
            f"{len(seen_sources)} files for course '{course_id or 'all'}'."
        )
    else:
        context_text = "No relevant course material context was found in the database."
        analysis = f"No vector search results found for query in course '{course_id or 'all'}'."

    return {
        "query": query,
        "retrieved_docs": retrieved,
        "context_text": context_text,
        "citations": citations,
        "analysis": analysis,
    }


async def generate_rag_response_node(state: AgentState) -> dict[str, Any]:
    """Generate LLM response combining System prompt, Course Context, History, and Question."""
    query = state.get("query", "")
    context_text = state.get("context_text", "No context available.")
    recent_messages = state.get("recent_messages", [])
    error = state.get("error")

    if error:
        error_msg = f"Unable to process request due to internal error: {error}"
        return {"response": error_msg, "messages": [AIMessage(content=error_msg)]}

    system_prompt = (
        "You are an AI Learning Companion assistant helping students with course materials and study questions.\n\n"
        "GUIDELINES:\n"
        "1. LANGUAGE: Always respond in the same language used by the user in their query (e.g., respond in Vietnamese if the user asks in Vietnamese, English if in English).\n"
        "2. CONVERSATIONAL GREETINGS & SOCIAL CHAT: For casual greetings, pleasantries, or general intro questions (e.g., 'hello', 'xin chào', 'cảm ơn', 'bạn là ai'), respond naturally, warmly, and politely as the AI Learning Companion without requiring course context or claiming missing information.\n"
        "3. COURSE & ACADEMIC QUESTIONS: For factual or subject-matter questions about course topics, base your answer strictly on the provided course material context.\n"
        "4. ABSENCE OF CONTEXT: If an academic or course topic question cannot be answered using the provided course context, clearly state in the user's language that the uploaded course materials do not contain sufficient information to answer.\n"
        "5. NO FABRICATION: Do NOT invent, speculate, or fabricate academic facts not supported by the context.\n"
        "6. ACADEMIC INTEGRITY: DO NOT solve or give final answers to graded homework/assignments. If asked for assignment answers, explain concepts, give hints, ask guiding questions, and provide similar examples to help the student learn.\n"
        "7. TONE: Maintain an encouraging, clear, and academically supportive tone."
    )


    prompt_messages: list[Any] = [SystemMessage(content=system_prompt)]

    # Add context block as system message or instruction
    context_instruction = f"Provided Course Material Context:\n{context_text}"
    prompt_messages.append(SystemMessage(content=context_instruction))

    # Add recent conversation history (if any)
    for msg in recent_messages:
        prompt_messages.append(msg)

    # Add current question if not already in recent history
    if not (recent_messages and getattr(recent_messages[-1], "content", "") == query):
        prompt_messages.append(HumanMessage(content=f"User Question: {query}"))

    try:
        llm = get_llm()
        ai_msg = await llm.ainvoke(prompt_messages)
        if isinstance(ai_msg.content, list):
            texts = []
            for part in ai_msg.content:
                if isinstance(part, dict) and "text" in part:
                    texts.append(part["text"])
                elif isinstance(part, str):
                    texts.append(part)
                else:
                    texts.append(str(part))
            response_text = "".join(texts)
        else:
            response_text = str(ai_msg.content)
    except Exception as e:
        logger.error(f"Error calling LLM provider: {e}")
        err_str = str(e)
        if "invalid_api_key" in err_str.lower() or "401" in err_str or "Invalid API Key" in err_str:
            response_text = (
                "GROQ_API_KEY chưa hợp lệ hoặc chưa được điền trong file .env!\n"
                "👉 Bạn hãy truy cập https://console.groq.com/keys để tạo API Key miễn phí, sau đó dán vào file .env:\n"
                "GROQ_API_KEY=gsk_..."
            )
        else:
            response_text = (
                f"I encountered an issue generating a response. "
                f"Please try again later. (Error: {e})"
            )

    return {
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }
