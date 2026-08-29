import asyncio
from langchain_openai import ChatOpenAI
from src.config import get_settings

async def test_llm():
    settings = get_settings()
    models_to_test = [
        "google/gemini-2.5-flash",
        "meta-llama/llama-3.3-70b-instruct",
        "google/gemini-flash-1.5",
        "qwen/qwen-2.5-72b-instruct",
    ]
    
    for m in models_to_test:
        try:
            llm = ChatOpenAI(
                model=m,
                api_key=settings.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
            )
            res = await llm.ainvoke("Xin chào, hãy trả lời 'OK'")
            print(f"Model {m} SUCCESS:", res.content)
            break
        except Exception as e:
            print(f"Model {m} error:", e)

if __name__ == "__main__":
    asyncio.run(test_llm())
