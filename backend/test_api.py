import os
from dotenv import load_dotenv
from groq import Groq
import sys

# Ensure UTF-8 output if possible, otherwise fallback
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_groq():
    # Load .env file
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("[ERROR] GROQ_API_KEY not found in .env file.")
        return

    print(f"Testing Groq API with key: {api_key[:10]}...")
    
    try:
        client = Groq(api_key=api_key)
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": "Confirm you are working by saying 'API Connection Successful'."
                }
            ],
            max_tokens=20
        )
        
        response = completion.choices[0].message.content
        print(f"[SUCCESS] Response received from Groq:")
        print("-" * 30)
        print(response)
        print("-" * 30)
        
    except Exception as e:
        print(f"[FAILED] API Test Failed: {str(e)}")

if __name__ == "__main__":
    test_groq()
