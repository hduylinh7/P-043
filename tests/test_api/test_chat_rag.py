from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from src.agents.nodes.rag_nodes import generate_rag_response_node, retrieve_context_node
from src.repositories.chat_repository import ChatRepository


@pytest.mark.asyncio
async def test_retrieve_context_node_with_docs():
    mock_doc = MagicMock()
    mock_doc.page_content = "Linear Regression is a machine learning algorithm."
    mock_doc.metadata = {"file_name": "ml_intro.pdf", "material_id": "mat-1", "chunk_index": 0}

    with patch("src.services.rag_service._get_vector_store") as mock_vstore:
        store_inst = MagicMock()
        store_inst.similarity_search_with_score.return_value = [(mock_doc, 0.12)]
        mock_vstore.return_value = store_inst

        state = {
            "query": "What is linear regression?",
            "course_id": "course-101",
        }
        res = await retrieve_context_node(state)

        assert len(res["retrieved_docs"]) == 1
        assert "Linear Regression" in res["context_text"]
        assert len(res["citations"]) == 1
        assert res["citations"][0]["file_name"] == "ml_intro.pdf"


@pytest.mark.asyncio
async def test_retrieve_context_node_empty():
    with patch("src.services.rag_service._get_vector_store") as mock_vstore:
        store_inst = MagicMock()
        store_inst.similarity_search_with_score.return_value = []
        mock_vstore.return_value = store_inst

        state = {
            "query": "Quantum physics basics",
            "course_id": "course-101",
        }
        res = await retrieve_context_node(state)

        assert len(res["retrieved_docs"]) == 0
        assert "No relevant course material context was found" in res["context_text"]


@pytest.mark.asyncio
async def test_generate_rag_response_node():
    mock_llm_inst = AsyncMock()
    mock_llm_inst.ainvoke.return_value = AIMessage(content="Linear regression fits a linear equation to data.")

    with patch("src.agents.nodes.rag_nodes.get_llm", return_value=mock_llm_inst):
        state = {
            "query": "What is linear regression?",
            "context_text": "Linear Regression fits a linear line.",
            "recent_messages": [],
        }
        res = await generate_rag_response_node(state)
        assert "Linear regression" in res["response"]


@pytest.mark.asyncio
async def test_chat_repository_recent_messages(prepare_database):
    from src.conftest import TestSessionLocal

    async with TestSessionLocal() as db:
        session = await ChatRepository.create_session(
            db, user_id="user_test", course_id="course_test", title="RAG Session"
        )
        assert session.id is not None
        assert session.course_id == "course_test"

        for i in range(15):
            await ChatRepository.add_message(
                db, session_id=session.id, role="user" if i % 2 == 0 else "assistant", content=f"Message {i}"
            )

        recent = await ChatRepository.get_recent_messages(db, session_id=session.id, limit=5)
        assert len(recent) == 5
        assert recent[-1].content == "Message 14"
        assert recent[0].content == "Message 10"


@pytest.mark.asyncio
async def test_chat_api_endpoint(client):
    mock_doc = MagicMock()
    mock_doc.page_content = "Convolutional Neural Networks excel at computer vision tasks."
    mock_doc.metadata = {"file_name": "deep_learning.pdf", "material_id": "mat-dl", "chunk_index": 1}

    mock_llm_inst = AsyncMock()
    mock_llm_inst.ainvoke.return_value = AIMessage(
        content="According to deep_learning.pdf, CNNs excel at computer vision tasks."
    )

    with patch("src.services.rag_service._get_vector_store") as mock_vstore, \
         patch("src.agents.nodes.rag_nodes.get_llm", return_value=mock_llm_inst):

        store_inst = MagicMock()
        store_inst.similarity_search_with_score.return_value = [(mock_doc, 0.05)]
        mock_vstore.return_value = store_inst

        response = await client.post(
            "/api/v1/chat",
            json={
                "message": "What are CNNs good at?",
                "course_id": "course-cs50",
                "user_id": "student_1",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert "citations" in data
        assert len(data["citations"]) > 0
        assert data["citations"][0]["file_name"] == "deep_learning.pdf"
