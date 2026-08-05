from langchain_core.messages import AIMessage, HumanMessage

from src.agents.state import AgentState
from src.services.llm import get_llm


async def analyze_node(state: AgentState) -> dict:
    """Analyze query from user."""
    query = state.get("query", "")
    messages = state.get("messages", [])

    if not query and messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "content"):
            query = str(last_msg.content)

    analysis = f"Analysis for query: '{query}'"
    return {"query": query, "analysis": analysis}


async def respond_node(state: AgentState) -> dict:
    """Generate final response using gpt-4o-mini LLM."""
    query = state.get("query", "")
    analysis = state.get("analysis", "")
    error = state.get("error")

    if error:
        return {"response": f"Error during processing: {error}"}

    try:
        llm = get_llm()
        prompt = (
            f"You are an AI assistant. User query: {query}\n"
            f"Context Analysis: {analysis}\n"
            f"Provide a helpful, accurate, and concise response."
        )
        ai_msg = await llm.ainvoke([HumanMessage(content=prompt)])
        response_text = str(ai_msg.content)
    except Exception as e:
        # Fallback if API key missing or offline
        response_text = f"Processed response for '{query}' (LLM Status: {e})"

    return {
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }
