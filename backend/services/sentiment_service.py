# -----------------------------------------------------------------------------
# services/sentiment_service.py — AI-Powered Sentiment Scoring
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   Uses OpenAI to analyze the "mood" of customer messages. Returns a score
#   from 0.0 (completely happy) to 1.0 (very angry/frustrated).
#
# HOW IT WORKS:
#   We send a batch of customer messages to GPT-4o-mini with a system prompt
#   that asks it to rate each one. The model returns JSON scores. We store
#   the result in the ticket's anger_score field so we only compute once.
#
# WHY NOT SCORE EVERY MESSAGE IN REAL TIME?
#   Adding an extra OpenAI call to the live chat flow would slow down 
#   responses. Instead, we batch-score when the analytics page loads.
# -----------------------------------------------------------------------------

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from core.config import settings
import json


SENTIMENT_PROMPT = """You are a sentiment analysis expert. Rate each customer message on a frustration scale from 0.0 to 1.0 where:
- 0.0 = very happy, satisfied, thanking
- 0.3 = neutral, factual question
- 0.5 = slightly frustrated, impatient
- 0.7 = clearly upset, complaining
- 1.0 = extremely angry, threatening

Return a JSON array of scores, one per message. Example: [0.3, 0.7, 0.1]
Only return the JSON array, nothing else."""


def score_messages_batch(messages: list[str]) -> list[float]:
    """
    Score a batch of customer messages for sentiment.
    
    Args:
        messages: List of customer message strings

    Returns:
        List of floats (0.0 - 1.0), one per message
    """
    if not messages:
        return []

    # Cap at 50 messages per batch to keep the prompt manageable
    batch = messages[:50]

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
        max_tokens=200,
    )

    # Format messages as numbered list
    numbered = "\n".join(f"{i+1}. \"{msg[:200]}\"" for i, msg in enumerate(batch))

    try:
        result = llm.invoke([
            SystemMessage(content=SENTIMENT_PROMPT),
            HumanMessage(content=numbered),
        ])

        scores = json.loads(result.content.strip())
        # Validate and clamp
        return [max(0.0, min(1.0, float(s))) for s in scores]
    except Exception as e:
        print(f"[sentiment] Batch scoring failed: {e}")
        # Return neutral scores on failure
        return [0.3] * len(batch)
