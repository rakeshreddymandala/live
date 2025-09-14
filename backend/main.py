from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import base64
import httpx
from dotenv import load_dotenv
from groq import Groq
import asyncio
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Avatar Backend", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Check if API keys are loaded
print(f"Groq API Key loaded: {'✓' if os.getenv('GROQ_API_KEY') else '✗'}")
print(f"ElevenLabs API Key loaded: {'✓' if os.getenv('ELEVENLABS_API_KEY') else '✗'}")

if not os.getenv("GROQ_API_KEY"):
    raise ValueError("GROQ_API_KEY not found in environment variables")
if not os.getenv("ELEVENLABS_API_KEY"):
    raise ValueError("ELEVENLABS_API_KEY not found in environment variables")

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    voice: Optional[str] = "default"

class ChatResponse(BaseModel):
    text: str
    audio: str  # base64 encoded audio

# Available ElevenLabs voices
VOICE_MAP = {
    "default": "pNInz6obpgDQGcFmaJgB",  # Adam
    "alloy": "pNInz6obpgDQGcFmaJgB",    # Adam
    "warm": "EXAVITQu4vr4xnSDxMaL",     # Bella
    "energetic": "21m00Tcm4TlvDq8ikWAM" # Rachel
}

async def get_groq_response(message: str) -> str:
    """Get AI response from Groq"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant. Keep your responses conversational and engaging, but concise (1-2 sentences max)."
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
            model="llama-3.1-8b-instant",  # Updated to current supported model
            temperature=0.7,
            max_tokens=150
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

async def get_elevenlabs_audio(text: str, voice: str = "default") -> str:
    """Convert text to speech using ElevenLabs and return base64 audio"""
    try:
        voice_id = VOICE_MAP.get(voice, VOICE_MAP["default"])
        print(f"Using voice_id: {voice_id} for voice: {voice}")
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        print(f"ElevenLabs URL: {url}")
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        print(f"Sending data: {data}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data, headers=headers)
            
        print(f"ElevenLabs response status: {response.status_code}")
        print(f"ElevenLabs response headers: {response.headers}")
        
        if response.status_code != 200:
            print(f"ElevenLabs error response: {response.text}")
            raise HTTPException(status_code=500, detail=f"ElevenLabs API error: {response.text}")
        
        # Convert audio to base64
        audio_base64 = base64.b64encode(response.content).decode('utf-8')
        print(f"Generated audio base64 length: {len(audio_base64)}")
        return audio_base64
        
    except Exception as e:
        print(f"Exception in get_elevenlabs_audio: {str(e)}")
        print(f"Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Avatar Backend is running!", "status": "healthy"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint - processes text through Groq and returns TTS audio"""
    try:
        print(f"Received request: {request.message}, voice: {request.voice}")
        
        # Get AI response from Groq
        print("Calling Groq API...")
        ai_response = await get_groq_response(request.message)
        print(f"Groq response: {ai_response}")
        
        # Convert response to speech using ElevenLabs
        print("Calling ElevenLabs API...")
        audio_base64 = await get_elevenlabs_audio(ai_response, request.voice)
        print("ElevenLabs API successful")
        
        return ChatResponse(
            text=ai_response,
            audio=audio_base64
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in chat endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/test/groq")
async def test_groq():
    """Test Groq API connection"""
    try:
        response = await get_groq_response("Hello, this is a test.")
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/test/elevenlabs")
async def test_elevenlabs():
    """Test ElevenLabs API connection"""
    try:
        audio = await get_elevenlabs_audio("Hello, this is a test.", "default")
        return {"status": "success", "audio_length": len(audio)}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/voices")
async def get_voices():
    """Get available voice options"""
    return {
        "voices": list(VOICE_MAP.keys()),
        "default": "default"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)