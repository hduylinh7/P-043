import sys
import os

sys.path.insert(0, os.path.abspath("."))

from src.services.rag_service import RAGService, _get_qdrant_client
from src.config import get_settings

output_lines = []

try:
    settings = get_settings()
    client = _get_qdrant_client()
    collection_name = settings.qdrant_collection_name or "course_materials"
    
    output_lines.append(f"Collection: {collection_name}")
    count = client.count(collection_name=collection_name)
    output_lines.append(f"Total points in Qdrant: {count.count}")
    
    scroll_res, _ = client.scroll(
        collection_name=collection_name,
        limit=10,
        with_payload=True,
        with_vectors=False,
    )
    output_lines.append("\nSample points from Qdrant:")
    for idx, p in enumerate(scroll_res):
        output_lines.append(f"--- Point {idx+1} ---")
        output_lines.append(f"ID: {p.id}")
        output_lines.append(f"Payload: {p.payload}")
except Exception as e:
    output_lines.append(f"Error querying Qdrant: {e}")

with open("scratch/output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print("Wrote output to scratch/output.txt")
