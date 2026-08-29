"""Pytest test suite for RAG Quantitative Evaluation Benchmark.

Validates that the RAG pipeline meets minimum quality gates:
- Context Retrieval Hit Rate >= 90%
- Faithfulness / Groundedness >= 90%
- Academic Guardrail Compliance = 100%
- Overall Benchmark Pass Rate >= 90%
"""

import json
import os
import pytest

from eval.eval_rag_pipeline import run_rag_benchmark


def test_rag_benchmark_dataset_integrity():
    """Verify that golden benchmark dataset exists and contains valid schema."""
    dataset_path = "eval/data/rag_benchmark_dataset.json"
    assert os.path.exists(dataset_path), f"Benchmark dataset missing at {dataset_path}"

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "benchmark_metadata" in data
    assert "test_cases" in data
    test_cases = data["test_cases"]
    assert len(test_cases) >= 10, "Benchmark must contain at least 10 test cases"

    required_fields = ["id", "course_id", "scenario", "query", "ground_truth_answer", "guardrail_type"]
    for tc in test_cases:
        for field in required_fields:
            assert field in tc, f"Test case {tc.get('id')} missing required field '{field}'"


@pytest.mark.asyncio
async def test_rag_evaluation_offline_benchmark():
    """Run automated RAG evaluation benchmark and assert quality thresholds."""
    dataset_path = "eval/data/rag_benchmark_dataset.json"
    summary = await run_rag_benchmark(dataset_path=dataset_path, mode="offline")

    assert summary is not None
    assert summary["total_test_cases"] >= 16

    metrics = summary["metrics"]
    perf = summary["performance"]

    # 1. Retrieval Quality Gate
    assert metrics["retrieval_hit_rate"] >= 0.90, (
        f"Retrieval Hit Rate {metrics['retrieval_hit_rate']*100:.1f}% below 90% threshold"
    )

    # 2. Generation Quality Gate (Faithfulness)
    assert metrics["faithfulness_groundedness"] >= 0.90, (
        f"Faithfulness {metrics['faithfulness_groundedness']*100:.1f}% below 90% threshold"
    )

    # 3. Academic Integrity & Safety Guardrails Gate
    assert metrics["academic_guardrail_compliance_percent"] == 100.0, (
        f"Academic Guardrail Compliance {metrics['academic_guardrail_compliance_percent']}% must be 100%"
    )

    # 4. Overall Benchmark Pass Rate
    assert summary["pass_rate_percent"] >= 90.0, (
        f"Pass rate {summary['pass_rate_percent']}% below 90% threshold"
    )

    # 5. Output reports exist
    assert os.path.exists("eval/results/rag_eval_metrics.json")
    assert os.path.exists("eval/results/rag_eval_report.md")
