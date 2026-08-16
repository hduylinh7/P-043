from langgraph.graph import END, START, StateGraph

from src.agents.nodes.planner_nodes import (
    analyze_and_decide_node,
    execute_planner_tools_node,
    generate_summary_node,
    load_context_node,
)
from src.agents.planner_state import PlannerAgentState


def should_continue(state: PlannerAgentState) -> str:
    """Check if an error occurred during context retrieval."""
    if state.get("error"):
        return END
    return "analyze_and_decide"


def build_planner_graph():
    """Build and compile the LangGraph workflow for Planner Agent."""
    workflow = StateGraph(PlannerAgentState)

    # Add nodes
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("analyze_and_decide", analyze_and_decide_node)
    workflow.add_node("execute_planner_tools", execute_planner_tools_node)
    workflow.add_node("generate_summary", generate_summary_node)

    # Add edges
    workflow.add_edge(START, "load_context")
    workflow.add_conditional_edges("load_context", should_continue)
    workflow.add_edge("analyze_and_decide", "execute_planner_tools")
    workflow.add_edge("execute_planner_tools", "generate_summary")
    workflow.add_edge("generate_summary", END)

    return workflow.compile()


planner_agent_graph = build_planner_graph()
