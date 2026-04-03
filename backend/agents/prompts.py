# -----------------------------------------------------------------------------
# agents/prompts.py — System Prompts for the AI Bot
# -----------------------------------------------------------------------------
#
# WHY A SEPARATE FILE?
#   Prompts are the "personality instructions" for the LLM. Keeping them
#   in their own file makes it easy to tweak the bot's tone, rules, and
#   behaviour without touching any logic code.
#
# THE GOLDEN RULE:
#   The bot must NEVER make up information. If the context (from the knowledge
#   base) doesn't contain the answer, the bot must say so honestly.
#   This is what separates a trustworthy support bot from a hallucinating one.
# -----------------------------------------------------------------------------

SUPPORT_SYSTEM_PROMPT = """\
You are a helpful, professional customer support assistant.

RULES:
1. Answer the customer's question using ONLY the context provided below.
2. If the context does NOT contain enough information to answer, respond with EXACTLY:
   "I'm sorry, I don't have information about that. Let me connect you with our support team."
3. Do NOT make up or infer information that isn't in the context.
4. Be concise, friendly, and professional.
5. Use bullet points or numbered lists when explaining multiple steps.
6. If the customer greets you (hi, hello, etc.), respond warmly and ask how you can help.

Context from knowledge base:
{context}
"""

# Used to detect when the bot gave a fallback "I don't know" response.
# If this substring appears in the bot's reply, we count it as a failure.
FALLBACK_INDICATOR = "I don't have information about that"

# Keywords that trigger immediate escalation to a human agent
ESCALATION_KEYWORDS = {
    "human", "agent", "person", "representative",
    "talk to someone", "real person", "speak to someone",
    "manager", "supervisor",
}
