"""
AI-powered Daily Journal Bot

A FastAPI application that accepts journal entries, performs sentiment analysis,
and returns friendly, empathetic responses based on the detected sentiment.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from transformers import pipeline
import uvicorn
from typing import Optional
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to store the sentiment analysis pipeline
sentiment_analyzer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage the application lifespan - startup and shutdown events.
    """
    global sentiment_analyzer
    
    # Startup: Load the sentiment analysis model
    try:
        logger.info("Loading sentiment analysis model...")
        # Load the DistilBERT model fine-tuned for sentiment analysis
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            top_k=None  # Returns all scores (replaces deprecated return_all_scores=True)
        )
        logger.info("✅ Sentiment analysis model loaded successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to load sentiment analysis model: {e}")
        raise e
    
    # Yield control to the application
    yield
    
    # Shutdown: Clean up resources (if needed)
    logger.info("Shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Daily Journal Bot",
    description="An AI-powered journal bot that analyzes your day and provides friendly reflections",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Pydantic models for request/response
class JournalEntry(BaseModel):
    text: str
    
class JournalResponse(BaseModel):
    sentiment: str
    confidence: float
    reflection: str
    emoji: str

def generate_friendly_response(sentiment: str, confidence: float) -> tuple[str, str]:
    """
    Generate a friendly reflection message based on sentiment analysis results.
    
    Args:
        sentiment: The detected sentiment (POSITIVE or NEGATIVE)
        confidence: Confidence score of the prediction
        
    Returns:
        tuple: (reflection_message, emoji)
    """
    
    if sentiment == "POSITIVE":
        if confidence > 0.8:
            reflections = [
                "What a wonderful day you've had! Your positive energy really shines through ✨",
                "It sounds like you're having a fantastic time! Keep embracing those good vibes 🌟",
                "Your joy is contagious! Thanks for sharing such uplifting thoughts 😊"
            ]
            emoji = "😊"
        else:
            reflections = [
                "There's definitely some positivity in your day! Hold onto those bright moments 🌤️",
                "I can sense some good vibes in your entry. Focus on what's going well! 💫",
                "It sounds like there are some nice moments to appreciate today 🌱"
            ]
            emoji = "🙂"
    else:  # NEGATIVE
        if confidence > 0.8:
            reflections = [
                "Sounds like a tough day — be kind to yourself ❤️",
                "I hear you're going through a challenging time. You're stronger than you know 💪",
                "Difficult days happen to everyone. Take care of yourself and remember this too shall pass 🌅"
            ]
            emoji = "❤️"
        else:
            reflections = [
                "It seems like you're having a mixed day. That's completely normal 🌈",
                "I sense some challenges in your day. Remember to be gentle with yourself 🤗",
                "Life has its ups and downs. You're doing your best, and that's what matters 💝"
            ]
            emoji = "🤗"
    
    # Return a random reflection (in a real app, you might want to use random.choice)
    return reflections[0], emoji

@app.post("/journal", response_model=JournalResponse)
async def analyze_journal_entry(entry: JournalEntry):
    """
    Analyze a journal entry and return a friendly reflection.
    
    Args:
        entry: JournalEntry containing the text to analyze
        
    Returns:
        JournalResponse with sentiment, confidence, reflection, and emoji
    """
    
    if not sentiment_analyzer:
        raise HTTPException(
            status_code=500,
            detail="Sentiment analysis model not loaded. Please try again later."
        )
    
    # Validate input
    if not entry.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Journal entry cannot be empty."
        )
    
    if len(entry.text) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Journal entry is too long. Please keep it under 1000 characters."
        )
    
    try:
        # Perform sentiment analysis
        logger.info(f"Analyzing journal entry: '{entry.text[:50]}...'")
        results = sentiment_analyzer(entry.text)
        
        # Extract the highest confidence prediction
        best_prediction = max(results[0], key=lambda x: x['score'])
        sentiment = best_prediction['label']
        confidence = best_prediction['score']
        
        # Generate friendly response
        reflection, emoji = generate_friendly_response(sentiment, confidence)
        
        logger.info(f"Analysis complete: {sentiment} ({confidence:.2f})")
        
        return JournalResponse(
            sentiment=sentiment,
            confidence=confidence,
            reflection=reflection,
            emoji=emoji
        )
        
    except Exception as e:
        logger.error(f"Error analyzing journal entry: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while analyzing your journal entry. Please try again."
        )

@app.get("/")
async def root():
    """
    Serve the main HTML page for the Daily Journal Bot frontend.
    """
    return FileResponse("static/index.html")

@app.get("/api")
async def api_info():
    """
    API information endpoint for developers.
    """
    return {
        "message": "Daily Journal Bot API",
        "description": "An AI-powered journal bot that analyzes your day and provides friendly reflections",
        "version": "1.0.0",
        "endpoints": {
            "POST /journal": "Submit a journal entry for sentiment analysis",
            "GET /health": "Check API health status",
            "GET /docs": "Interactive API documentation",
            "GET /": "Web interface"
        },
        "usage": "Send a POST request to /journal with JSON: {'text': 'Your journal entry here'}"
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    model_status = "loaded" if sentiment_analyzer else "not loaded"
    return {
        "status": "healthy",
        "model_status": model_status
    }

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )
