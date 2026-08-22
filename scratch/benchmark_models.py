import sys
import os
import time

sys.path.insert(0, os.path.abspath("."))

from src.services.llm import get_llm
from langchain_core.messages import HumanMessage

models_to_test = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
]

for m in models_to_test:
    print(f"\n--- Testing model: {m} ---")
    start = time.time()
    try:
        llm = get_llm(model_name=m, provider="groq")
        res = llm.invoke([HumanMessage(content="Xin chao, hay gioi thieu ngan gon 1 cau ve ban than.")])
        elapsed = time.time() - start
        print(f"[OK] Success! Time: {elapsed:.2f}s")
        print(f"Response preview: {str(res.content)[:80]}...")
    except Exception as e:
        print(f"[ERROR] Failed: {e}")
