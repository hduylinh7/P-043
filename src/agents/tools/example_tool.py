import ast
import operator

from langchain_core.tools import tool

# Safe operator mapping for calculator
_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


@tool
def search_knowledge(query: str, course_id: str = "") -> str:
    """Tìm kiếm thông tin trong tài liệu khóa học (Vector DB RAG).

    Args:
        query: Câu hỏi hoặc từ khóa cần tìm kiếm
        course_id: ID của khóa học cần giới hạn tìm kiếm (tùy chọn)

    Returns:
        Nội dung trích dẫn từ tài liệu môn học
    """
    from src.services.rag_service import RAGService

    results = RAGService.search_course_materials(course_id=course_id, query=query, top_k=4)
    if not results:
        return f"Không tìm thấy tài liệu phù hợp trong hệ thống cho từ khóa: {query}"

    snippets = []
    for item in results:
        file_name = item.get("metadata", {}).get("file_name", "Tài liệu")
        snippets.append(f"--- Nguồn ({file_name}) ---\n{item['content']}")

    return "\n\n".join(snippets)


@tool
def calculate(expression: str) -> str:
    """Tính toán biểu thức toán học an toàn (không dùng eval).

    Hỗ trợ: +, -, *, /, //, %, ** và dấu ngoặc.

    Args:
        expression: Biểu thức cần tính (ví dụ: "2 + 3 * 4")

    Returns:
        Kết quả tính toán
    """
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree.body)
        return str(result)
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError) as e:
        return f"Lỗi tính toán: {e}"


def _eval_node(node: ast.AST) -> float:
    """Recursively evaluate AST node using safe operators only."""
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")
    elif isinstance(node, ast.UnaryOp):
        op_func = _SAFE_OPERATORS.get(type(node.op))
        if op_func is None:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
        return op_func(_eval_node(node.operand))
    elif isinstance(node, ast.BinOp):
        op_func = _SAFE_OPERATORS.get(type(node.op))
        if op_func is None:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
        return op_func(_eval_node(node.left), _eval_node(node.right))
    else:
        raise ValueError(f"Unsupported expression: {type(node).__name__}")
