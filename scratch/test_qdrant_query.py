import sys
import os

sys.path.insert(0, os.path.abspath("."))

from src.services.rag_service import RAGService, _get_qdrant_client, _get_vector_store
from src.config import get_settings

def test_qdrant():
    settings = get_settings()
    client = _get_qdrant_client()
    collection_name = settings.qdrant_collection_name or "course_materials"
    
    print(f"Collection: {collection_name}")
    try:
        count = client.count(collection_name=collection_name)
        print(f"Total points in Qdrant: {count.count}")
        
        scroll_res, _ = client.scroll(
            collection_name=collection_name,
            limit=5,
            with_payload=True,
            with_vectors=False,
        )
        print("\nSample points from Qdrant:")
        for idx, p in enumerate(scroll_res):
            print(f"--- Point {idx+1} ---")
            print(f"ID: {p.id}")
            print(f"Payload keys: {list(p.payload.keys()) if p.payload else None}")
            if p.payload:
                meta = p.payload.get("metadata", {})
                print(f"Metadata: {meta}")
                text = p.payload.get("page_content") or p.payload.get("text") or str(p.payload)[:100]
                print(f"Text preview: {text[:100]}...")
    except Exception as e:
        print(f"Error querying Qdrant: {e}")

if __name__ == "__main__":
    test_qdrant()
