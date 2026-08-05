from langgraph.graph import END, START, StateGraph

from src.agents.nodes.rag_nodes import generate_rag_response_node, retrieve_context_node
from src.agents.state import AgentState


def should_continue(state: AgentState) -> str:
    """Route based on whether a critical error occurred."""
    if state.get("error"):
        return END
    return "generate_rag_response"


def build_graph():
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("retrieve_context", retrieve_context_node)
    graph.add_node("generate_rag_response", generate_rag_response_node)

    # Add edges
    graph.add_edge(START, "retrieve_context")
    graph.add_conditional_edges("retrieve_context", should_continue)
    graph.add_edge("generate_rag_response", END)

    return graph.compile()


agent = build_graph()

