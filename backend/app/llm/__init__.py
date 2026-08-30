# backend/app/llm/__init__.py
import os
from app.llm.base import LLMProvider
from app.llm.ollama_provider import OllamaProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider

def get_llm_provider() -> LLMProvider:
    provider_type = os.getenv("LLM_PROVIDER", "ollama").lower()
    
    if provider_type == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "CRITICAL STARTUP ERROR: LLM_PROVIDER is set to 'groq' but GROQ_API_KEY is missing or empty. "
                "Please configure GROQ_API_KEY in your environment/dotenv file before booting the engine."
            )
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        return GroqProvider(api_key=api_key, model=model)
        
    if provider_type == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            return GeminiProvider(api_key=api_key)
        else:
            # Fall back to Ollama or standard heuristics
            print("WARNING: Gemini selected but GEMINI_API_KEY is not set. Falling back to GeminiProvider with fallback heuristics.")
            return GeminiProvider(api_key=None)
            
    # Default to Ollama
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    return OllamaProvider(base_url=base_url, model=model)
