import sys
import os

sys.path.insert(0, os.path.abspath("."))

from qdrant_client import models
from src.services.rag_service import RAGService, _get_qdrant_client, _get_vector_store
from src.config import get_settings

output_lines = []

def test_search():
    query = "Tóm tắt bài giảng này giúp tôi"
    course_id = "a6315168-eddf-4645-8f08-556f53b9e1b1"
    material_id = "ed1b4dbd-0e07-46d4-887c-9e9c7562a35c"

    output_lines.append("--- TEST 1: search_course_materials with material_id & course_id ---")
    results1 = RAGService.search_course_materials(
        course_id=course_id,
        query=query,
        material_id=material_id,
        top_k=5,
    )
    output_lines.append(f"Results count: {len(results1)}")
    for r in results1:
        output_lines.append(f" - Content length: {len(r.get('content', ''))}, score: {r.get('score')}")

    output_lines.append("\n--- TEST 2: similarity_search_with_score directly ---")
    vstore = _get_vector_store()
    
    # Filter 1: key="metadata.material_id"
    f1 = models.Filter(must=[models.FieldCondition(key="metadata.material_id", match=models.MatchValue(value=material_id))])
    res1 = vstore.similarity_search_with_score(query=query, k=5, filter=f1)
    output_lines.append(f"Filter key='metadata.material_id' count: {len(res1)}")

    # Filter 2: key="metadata.material_id" + key="metadata.course_id"
    f2 = models.Filter(must=[
        models.FieldCondition(key="metadata.material_id", match=models.MatchValue(value=material_id)),
        models.FieldCondition(key="metadata.course_id", match=models.MatchValue(value=course_id)),
    ])
    res2 = vstore.similarity_search_with_score(query=query, k=5, filter=f2)
    output_lines.append(f"Filter combined count: {len(res2)}")

    with open("scratch/filter_out.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))

if __name__ == "__main__":
    test_search()
