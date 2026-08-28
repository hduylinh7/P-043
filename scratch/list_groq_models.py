import sys
import os
import requests

sys.path.insert(0, os.path.abspath("."))

from src.config import get_settings

def list_groq_models():
    settings = get_settings()
    api_key = (settings.groq_api_key or os.getenv("GROQ_API_KEY") or "").strip()
    
    url = "https://api.groq.com/openai/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            models = data.get("data", [])
            print(f"Total models available on Groq: {len(models)}")
            print("\nAvailable Models List:")
            for m in sorted(models, key=lambda x: x.get("id", "")):
                m_id = m.get("id")
                active = m.get("active", True)
                owned_by = m.get("owned_by", "")
                print(f" - {m_id} (active: {active}, owner: {owned_by})")
        else:
            print(f"Error fetching models: Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    list_groq_models()
