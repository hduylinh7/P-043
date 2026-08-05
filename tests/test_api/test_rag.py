from unittest.mock import MagicMock, patch

import pytest

from src.services.rag_service import RAGService, _extract_text_from_bytes


def test_extract_text_plain_text():
    sample_text = "Chủ đề khóa học: Trí tuệ nhân tạo nâng cao"
    extracted = _extract_text_from_bytes(sample_text.encode("utf-8"), "sample.txt", "text/plain")
    assert extracted == sample_text


@patch("src.services.rag_service._get_vector_store")
def test_delete_material_vectors(mock_get_vector_store):
    mock_store = MagicMock()
    mock_get_vector_store.return_value = mock_store

    RAGService.delete_material_vectors("mat-123")
    mock_store.delete.assert_called_once_with(where={"material_id": "mat-123"})


@patch("src.services.rag_service._get_vector_store")
def test_search_course_materials(mock_get_vector_store):
    mock_doc = MagicMock()
    mock_doc.page_content = "Nội dung bài học AI Agent"
    mock_doc.metadata = {"course_id": "course-101", "file_name": "ai.pdf"}

    mock_store = MagicMock()
    mock_store.similarity_search_with_score.return_value = [(mock_doc, 0.15)]
    mock_get_vector_store.return_value = mock_store

    results = RAGService.search_course_materials(course_id="course-101", query="AI Agent")
    assert len(results) == 1
    assert results[0]["content"] == "Nội dung bài học AI Agent"
    assert results[0]["metadata"]["course_id"] == "course-101"
