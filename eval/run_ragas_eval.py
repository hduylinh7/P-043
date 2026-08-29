"""
Script Evaluation Tối Ưu Tiết Kiệm Token (Single-Prompt Multi-Metric Evaluator).

Phân loại đánh giá:
1. NHÓM RAG METRICS (Áp dụng cho category: "factual", "multi_hop"):
    Chạy Single-Prompt Evaluator: Gộp 4 chỉ số (faithfulness, answer_relevancy, 
    context_precision, context_recall) vào 01 lượt gọi LLM duy nhất per sample.
    -> Tiết kiệm 80% Token (tổng ~40k tokens cho 20 câu, không bị hit 200k TPD limit Groq).
    -> Chạy siêu nhanh trong 1 - 2 phút.

2. NHÓM BEHAVIORAL CHECKS (Áp dụng cho category: "out_of_scope", "ambiguous"):
    - out_of_scope  : Kiểm tra Agent từ chối câu hỏi ngoài phạm vi môn học (refusal check).
    - ambiguous     : Kiểm tra Agent nhận diện/làm rõ câu hỏi mơ hồ (clarification check).

Sử dụng:
    python eval/run_ragas_eval.py
    python eval/run_ragas_eval.py --input eval_dataset.json --output-dir eval/results
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Tuple

# Thêm project root vào sys.path để import từ src.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.messages import HumanMessage, SystemMessage
from src.services.llm import get_llm

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

METRIC_NAMES = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]


def check_refusal(answer: str) -> bool:
    """
    Kiểm tra câu trả lời có chứa các từ/cụm từ từ chối hợp lý cho câu hỏi out_of_scope.
    """
    if not answer or not answer.strip():
        return False

    text = answer.lower()
    refusal_keywords = [
        "không có thông tin",
        "không đề cập",
        "ngoài phạm vi",
        "tài liệu không cung cấp",
        "tài liệu không có",
        "không tìm thấy thông tin",
        "không tìm thấy",
        "không chứa thông tin",
        "không được đề cập",
        "chưa được cung cấp",
        "không có trong tài liệu",
        "không đề cập trong tài liệu",
        "không thuộc phạm vi",
        "không nằm trong",
        "does not contain",
        "no information",
        "out of scope",
        "not mentioned",
    ]
    return any(kw in text for kw in refusal_keywords)


def check_clarification(answer: str) -> bool:
    """
    Kiểm tra câu trả lời có dấu hiệu agent nhận diện/làm rõ câu hỏi mơ hồ (ambiguous).
    """
    if not answer or not answer.strip():
        return False

    text = answer.lower()
    clarify_keywords = [
        "chưa rõ",
        "có thể hiểu theo",
        "cần làm rõ",
        "tùy thuộc vào",
        "bạn muốn hỏi về",
        "xin vui lòng làm rõ",
        "vui lòng cung cấp thêm",
        "bạn đang đề cập đến",
        "bạn có thể có ý",
        "trường hợp 1",
        "giả định",
        "tùy vào",
        "under what context",
        "depends on",
        "please clarify",
    ]

    if any(kw in text for kw in clarify_keywords):
        return True

    # Agent hỏi lại người dùng
    if "?" in answer:
        return True

    # Agent liệt kê nhiều gạch đầu dòng/lựa chọn/giả định
    bullet_patterns = [r"^\s*[\-\*\•]\s+", r"^\s*\d+[\.\)]\s+"]
    lines = answer.splitlines()
    bullet_count = 0
    for line in lines:
        for pattern in bullet_patterns:
            if re.match(pattern, line):
                bullet_count += 1
                break
    if bullet_count >= 2:
        return True

    return False


def load_dataset(input_file: str) -> Dict[str, List[Any]]:
    """Đọc và validate eval_dataset.json."""
    if not os.path.exists(input_file):
        raise FileNotFoundError(
            f"Không tìm thấy '{input_file}'. "
            "Vui lòng chạy scripts/create_eval_dataset.py trước."
        )
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    required_keys = {"question", "contexts", "answer", "ground_truth"}
    missing = required_keys - set(data.keys())
    if missing:
        raise ValueError(f"eval_dataset.json thiếu các key: {missing}")

    total = len(data["question"])
    logger.info(f"Đã tải {total} mẫu từ '{input_file}'.")
    return data


def evaluate_single_sample_batch(
    question: str,
    contexts: List[str],
    answer: str,
    ground_truth: str,
    llm: Any,
) -> Dict[str, float]:
    """
    Đánh giá đồng thời cả 4 metric (faithfulness, answer_relevancy, context_precision, context_recall)
    trong 01 lần gọi LLM duy nhất.
    """
    ctx_formatted = "\n\n".join([f"- {c}" for c in contexts]) if contexts else "No context."

    prompt = f"""You are an expert RAG system evaluator.
Evaluate the following RAG output based on 4 metrics, assigning a score from 0.0 to 1.0 for each.

CONTEXTS:
{ctx_formatted}

QUESTION:
{question}

ACTUAL ANSWER:
{answer}

GROUND TRUTH ANSWER:
{ground_truth}

METRICS DEFINITIONS:
1. faithfulness (0.0 - 1.0): Is the ACTUAL ANSWER strictly factual and derived ONLY from the provided CONTEXTS? (1.0 = completely faithful with no hallucination, 0.0 = completely fabricated).
2. answer_relevancy (0.0 - 1.0): Does the ACTUAL ANSWER directly and helpfully address the QUESTION? (1.0 = perfectly relevant and complete answer, 0.0 = irrelevant or off-topic).
3. context_precision (0.0 - 1.0): Are the retrieved CONTEXTS relevant and clean without excessive noise/irrelevant information? (1.0 = highly relevant contexts, 0.0 = irrelevant contexts).
4. context_recall (0.0 - 1.0): Do the retrieved CONTEXTS contain all necessary information to state the GROUND TRUTH ANSWER? (1.0 = context contains full information, 0.0 = context misses key information).

OUTPUT FORMAT:
Return ONLY a valid JSON object with 4 floating point numbers between 0.0 and 1.0:
{{
  "faithfulness": 1.0,
  "answer_relevancy": 1.0,
  "context_precision": 1.0,
  "context_recall": 1.0
}}"""

    messages = [
        SystemMessage(content="You evaluate RAG outputs and return strictly JSON containing 4 numerical scores between 0.0 and 1.0."),
        HumanMessage(content=prompt),
    ]

    default_scores = {
        "faithfulness": 0.0,
        "answer_relevancy": 0.0,
        "context_precision": 0.0,
        "context_recall": 0.0,
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = llm.invoke(messages)
            content = resp.content if isinstance(resp.content, str) else str(resp.content)
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                if content.startswith("json"):
                    content = content[4:].strip()

            data = json.loads(content)
            scores = {}
            for m in METRIC_NAMES:
                val = data.get(m, 0.0)
                try:
                    scores[m] = round(float(val), 4)
                except (ValueError, TypeError):
                    scores[m] = 0.0
            return scores
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed for LLM Batch Evaluator: {e}")
            if attempt < max_retries - 1:
                time.sleep(3.0 * (attempt + 1))
    return default_scores


def run_evaluation(
    input_file: str = "eval_dataset.json",
    output_dir: str = "eval/results",
) -> Dict[str, Any]:
    """
    Chạy Batch RAG Evaluation cho (factual, multi_hop) và Behavioral checks cho (out_of_scope, ambiguous).
    """
    logger.info("==================================================")
    logger.info("  EVALUATION PIPELINE (Single-Prompt Token Saver) ")
    logger.info("==================================================")

    # 1. Tải dataset
    raw_data = load_dataset(input_file)
    total_samples = len(raw_data["question"])
    categories = raw_data.get("category", ["unknown"] * total_samples)

    # 2. Phân chia mẫu thành 2 nhóm
    rag_indices = [i for i, cat in enumerate(categories) if cat in {"factual", "multi_hop"}]
    behavioral_indices = [i for i, cat in enumerate(categories) if cat in {"out_of_scope", "ambiguous"}]

    logger.info(f"Phân loại dataset: RAG Metrics samples={len(rag_indices)}, Behavioral samples={len(behavioral_indices)}")

    # -------------------------------------------------------------------------
    # NHÓM 1: SINGLE-PROMPT MULTI-METRIC EVALUATION (factual, multi_hop)
    # -------------------------------------------------------------------------
    ragas_scores: Dict[str, Any] = {
        "overall_scores": {},
        "per_category_scores": {},
        "per_sample_scores": [],
    }

    if rag_indices:
        logger.info("\n--- Bắt đầu RAG Evaluation (Single-Prompt Evaluator) ---")
        eval_llm = get_llm(temperature=0)
        logger.info(f"Evaluator LLM Engine: {type(eval_llm).__name__}")

        per_sample_scores = []
        cat_scores_accumulator = defaultdict(lambda: defaultdict(list))
        overall_accumulator = defaultdict(list)

        for step, idx in enumerate(rag_indices, start=1):
            q = raw_data["question"][idx]
            ctxs = raw_data["contexts"][idx]
            ans = raw_data["answer"][idx]
            gt = raw_data["ground_truth"][idx]
            cat = categories[idx]

            logger.info(f"[{step}/{len(rag_indices)}] Đang đánh giá câu #{idx} ({cat}): '{q[:50]}...'")

            scores = evaluate_single_sample_batch(
                question=q,
                contexts=ctxs,
                answer=ans,
                ground_truth=gt,
                llm=eval_llm,
            )

            sample_entry = {
                "id": idx,
                "category": cat,
                "question": q,
                "answer": ans,
                "ground_truth": gt,
            }
            sample_entry.update(scores)
            per_sample_scores.append(sample_entry)

            for m_name in METRIC_NAMES:
                val = scores[m_name]
                cat_scores_accumulator[cat][m_name].append(val)
                overall_accumulator[m_name].append(val)

            # Nghỉ 1.5s giữa các request để siêu an toàn với rate limit
            time.sleep(1.5)

        # Tính overall averages
        overall_scores = {}
        for m_name in METRIC_NAMES:
            vals = overall_accumulator[m_name]
            overall_scores[m_name] = round(sum(vals) / len(vals), 4) if vals else 0.0

        # Tính per-category averages
        per_category_scores = {}
        for cat, metric_dict in cat_scores_accumulator.items():
            per_category_scores[cat] = {}
            for m_name in METRIC_NAMES:
                vals = metric_dict[m_name]
                per_category_scores[cat][m_name] = round(sum(vals) / len(vals), 4) if vals else 0.0

        ragas_scores = {
            "overall_scores": overall_scores,
            "per_category_scores": per_category_scores,
            "per_sample_scores": per_sample_scores,
        }
    else:
        logger.warning("⚠️ Bỏ qua RAG Evaluation vì không có mẫu thuộc 'factual' hoặc 'multi_hop'.")

    # -------------------------------------------------------------------------
    # NHÓM 2: BEHAVIORAL CHECKS (out_of_scope, ambiguous)
    # -------------------------------------------------------------------------
    behavioral_scores: Dict[str, Any] = {
        "out_of_scope": {"refusal_rate": 0.0, "total_samples": 0, "refused_samples": 0, "details": []},
        "ambiguous": {"clarification_rate": 0.0, "total_samples": 0, "clarified_samples": 0, "details": []},
    }

    if behavioral_indices:
        logger.info("\n--- Bắt đầu Behavioral Checks (out_of_scope & ambiguous) ---")
        oos_details = []
        amb_details = []

        for idx in behavioral_indices:
            cat = categories[idx]
            q = raw_data["question"][idx]
            ans = raw_data["answer"][idx]
            gt = raw_data["ground_truth"][idx]

            if cat == "out_of_scope":
                passed = check_refusal(ans)
                oos_details.append({
                    "id": idx,
                    "question": q,
                    "answer": ans,
                    "ground_truth": gt,
                    "passed": passed,
                })
            elif cat == "ambiguous":
                passed = check_clarification(ans)
                amb_details.append({
                    "id": idx,
                    "question": q,
                    "answer": ans,
                    "ground_truth": gt,
                    "passed": passed,
                })

        oos_total = len(oos_details)
        oos_passed = sum(1 for d in oos_details if d["passed"])
        oos_rate = round(oos_passed / oos_total, 4) if oos_total > 0 else 0.0

        amb_total = len(amb_details)
        amb_passed = sum(1 for d in amb_details if d["passed"])
        amb_rate = round(amb_passed / amb_total, 4) if amb_total > 0 else 0.0

        behavioral_scores = {
            "out_of_scope": {
                "refusal_rate": oos_rate,
                "total_samples": oos_total,
                "refused_samples": oos_passed,
                "details": oos_details,
            },
            "ambiguous": {
                "clarification_rate": amb_rate,
                "total_samples": amb_total,
                "clarified_samples": amb_passed,
                "details": amb_details,
            },
        }
    else:
        logger.warning("⚠️ Bỏ qua Behavioral Checks vì không có mẫu thuộc 'out_of_scope' hoặc 'ambiguous'.")

    # -------------------------------------------------------------------------
    # TỔNG HỢP VÀ LƯU KẾT QUẢ
    # -------------------------------------------------------------------------
    final_results = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "input_file": input_file,
            "total_samples": total_samples,
            "rag_samples_count": len(rag_indices),
            "behavioral_samples_count": len(behavioral_indices),
            "evaluator_type": "Single-Prompt Multi-Metric Evaluator (Token Saver)",
        },
        "ragas_scores": ragas_scores,
        "behavioral_scores": behavioral_scores,
    }

    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "eval_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
    logger.info(f"\n📄 Kết quả chi tiết đã lưu: '{json_path}'")

    report_path = os.path.join(output_dir, "eval_report.md")
    _write_markdown_report(final_results, report_path)
    logger.info(f"📋 Báo cáo tổng hợp đã lưu: '{report_path}'")

    _print_summary(final_results)

    return final_results


def _write_markdown_report(results: Dict[str, Any], report_path: str) -> None:
    """Tạo báo cáo Markdown tổng hợp với 2 section riêng biệt."""
    meta = results["metadata"]
    ragas_scores = results["ragas_scores"]
    behavioral_scores = results["behavioral_scores"]

    lines = [
        "# Evaluation Report — AI Learning Companion Agent",
        "",
        f"**Thời gian:** {meta['timestamp']}",
        f"**Dataset:** `{meta['input_file']}` (Tổng cộng: {meta['total_samples']} mẫu)",
        f"**Phương pháp:** {meta['evaluator_type']}",
        f"- Mẫu RAG Metrics (factual & multi_hop): {meta['rag_samples_count']} mẫu",
        f"- Mẫu Behavioral Checks (out_of_scope & ambiguous): {meta['behavioral_samples_count']} mẫu",
        "",
        "---",
        "",
        "## 1. RAG Metrics (Factual / Multi-hop)",
        "",
    ]

    overall = ragas_scores.get("overall_scores", {})
    per_cat = ragas_scores.get("per_category_scores", {})
    per_sample = ragas_scores.get("per_sample_scores", [])

    if overall:
        lines += [
            "### Overall Scores",
            "",
            "| Metric | Score | Status |",
            "|--------|-------|--------|",
        ]
        for metric, score in overall.items():
            emoji = "🟢" if score >= 0.7 else "🟡" if score >= 0.5 else "🔴"
            lines.append(f"| {metric} | {score:.4f} | {emoji} |")

        lines += [
            "",
            "### Scores by Category",
            "",
            "| Category | faithfulness | answer_relevancy | context_precision | context_recall |",
            "|----------|-------------|-----------------|-------------------|----------------|",
        ]
        for cat, scores in sorted(per_cat.items()):
            row = f"| **{cat}** |"
            for m in METRIC_NAMES:
                v = scores.get(m)
                row += f" {v:.4f} |" if v is not None else " N/A |"
            lines.append(row)

        lines += [
            "",
            "### Per-Sample Scores",
            "",
            "| # | Category | faithfulness | answer_relevancy | context_precision | context_recall | Question (tóm tắt) |",
            "|---|----------|-------------|-----------------|-------------------|----------------|---------------------|",
        ]
        for s in per_sample:
            q_short = (s["question"][:55] + "...") if len(s["question"]) > 55 else s["question"]
            row = (
                f"| {s['id']} | {s['category']} "
                f"| {s.get('faithfulness'):.4f} "
                f"| {s.get('answer_relevancy'):.4f} "
                f"| {s.get('context_precision'):.4f} "
                f"| {s.get('context_recall'):.4f} "
                f"| {q_short} |"
            )
            lines.append(row)
    else:
        lines.append("_Không có dữ liệu RAG evaluation._")

    lines += [
        "",
        "---",
        "",
        "## 2. Behavioral Checks (Out-of-scope / Ambiguous)",
        "",
        "### Summary",
        "",
        "| Category | Metric | Rate (%) | Passed / Total | Status |",
        "|----------|--------|----------|----------------|--------|",
    ]

    oos = behavioral_scores.get("out_of_scope", {})
    if oos.get("total_samples", 0) > 0:
        rate = oos["refusal_rate"] * 100
        emoji = "🟢" if rate >= 80 else "🟡" if rate >= 50 else "🔴"
        lines.append(
            f"| out_of_scope | Refusal Rate | {rate:.1f}% | {oos['refused_samples']} / {oos['total_samples']} | {emoji} |"
        )
    else:
        lines.append("| out_of_scope | Refusal Rate | N/A | 0 / 0 | - |")

    amb = behavioral_scores.get("ambiguous", {})
    if amb.get("total_samples", 0) > 0:
        rate = amb["clarification_rate"] * 100
        emoji = "🟢" if rate >= 80 else "🟡" if rate >= 50 else "🔴"
        lines.append(
            f"| ambiguous | Clarification Rate | {rate:.1f}% | {amb['clarified_samples']} / {amb['total_samples']} | {emoji} |"
        )
    else:
        lines.append("| ambiguous | Clarification Rate | N/A | 0 / 0 | - |")

    # Chi tiết Out-of-Scope
    if oos.get("details"):
        lines += [
            "",
            "### Out-of-Scope Details",
            "",
            "| # | Question | Refused? | Answer (tóm tắt) |",
            "|---|----------|----------|------------------|",
        ]
        for d in oos["details"]:
            status = "✅ Pass" if d["passed"] else "❌ Fail"
            ans_short = (d["answer"][:60] + "...") if len(d["answer"]) > 60 else d["answer"]
            lines.append(f"| {d['id']} | {d['question']} | {status} | {ans_short} |")

    # Chi tiết Ambiguous
    if amb.get("details"):
        lines += [
            "",
            "### Ambiguous Details",
            "",
            "| # | Question | Clarified? | Answer (tóm tắt) |",
            "|---|----------|------------|------------------|",
        ]
        for d in amb["details"]:
            status = "✅ Pass" if d["passed"] else "❌ Fail"
            ans_short = (d["answer"][:60] + "...") if len(d["answer"]) > 60 else d["answer"]
            lines.append(f"| {d['id']} | {d['question']} | {status} | {ans_short} |")

    lines += ["", "---", "", "_Báo cáo được tạo tự động bởi `eval/run_ragas_eval.py`_"]

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _print_summary(results: Dict[str, Any]) -> None:
    """In tóm tắt kết quả ra console (dùng ASCII safe để tránh UnicodeEncodeError trên Windows)."""
    ragas_scores = results.get("ragas_scores", {})
    behavioral_scores = results.get("behavioral_scores", {})

    print("\n" + "=" * 58)
    print("          EVALUATION RESULTS SUMMARY")
    print("=" * 58)

    print("\n--- 1. RAG METRICS (factual & multi_hop) ---")
    overall = ragas_scores.get("overall_scores", {})
    per_cat = ragas_scores.get("per_category_scores", {})

    if overall:
        print(f"  {'Metric':<22} {'Score':>8}")
        print("  " + "-" * 32)
        for metric, score in overall.items():
            tag = "[GOOD]" if score >= 0.7 else "[OK]  " if score >= 0.5 else "[POOR]"
            print(f"  {metric:<22} {tag} {score:.4f}")

        print("\n  Theo Category:")
        for cat, scores in sorted(per_cat.items()):
            print(f"    [{cat}]")
            for m, v in scores.items():
                print(f"      {m:<20} {v:.4f}")
    else:
        print("  (Không có dữ liệu RAG evaluation)")

    print("\n--- 2. BEHAVIORAL CHECKS (out_of_scope & ambiguous) ---")
    oos = behavioral_scores.get("out_of_scope", {})
    amb = behavioral_scores.get("ambiguous", {})

    if oos.get("total_samples", 0) > 0:
        rate = oos["refusal_rate"] * 100
        tag = "[GOOD]" if rate >= 80 else "[OK]  " if rate >= 50 else "[POOR]"
        print(f"  out_of_scope : Refusal Rate       = {rate:.1f}% ({oos['refused_samples']}/{oos['total_samples']}) {tag}")
    else:
        print("  out_of_scope : N/A")

    if amb.get("total_samples", 0) > 0:
        rate = amb["clarification_rate"] * 100
        tag = "[GOOD]" if rate >= 80 else "[OK]  " if rate >= 50 else "[POOR]"
        print(f"  ambiguous    : Clarification Rate = {rate:.1f}% ({amb['clarified_samples']}/{amb['total_samples']}) {tag}")
    else:
        print("  ambiguous    : N/A")

    print("=" * 58 + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chạy Evaluation pipeline (Single-Prompt Evaluator + Behavioral checks)")
    parser.add_argument(
        "--input",
        default="eval_dataset.json",
        help="Đường dẫn tới eval_dataset.json (mặc định: eval_dataset.json)",
    )
    parser.add_argument(
        "--output-dir",
        default="eval/results",
        help="Thư mục lưu kết quả (mặc định: eval/results)",
    )
    args = parser.parse_args()

    run_evaluation(input_file=args.input, output_dir=args.output_dir)


if __name__ == "__main__":
    main()
