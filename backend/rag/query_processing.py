"""Conversation-aware query contextualization — rewrites a follow-up question
into a standalone retrieval query using recent turns, without ever answering
it or changing its intent. Skipped entirely on the first turn of a
conversation (no history to disambiguate against), which also means a
single-question Q&A never pays the extra LLM round trip.
"""
from typing import List

from ai import AITask, ChatMessage, ai_gateway
from rag.config import CONVERSATION_HISTORY_TURNS

_REWRITE_SYSTEM_PROMPT = (
    "You rewrite a user's follow-up question into a standalone question that "
    "can be understood without the conversation history, for use as a search "
    "query. Preserve the user's actual intent exactly — do not answer the "
    "question, do not add information, do not change what is being asked. "
    "If the question is already standalone, return it unchanged. Respond "
    "with only the rewritten question, nothing else."
)


async def contextualize_query(question: str, history: List[ChatMessage], uid: str | None = None) -> str:
    if not history:
        return question

    recent = history[-(CONVERSATION_HISTORY_TURNS * 2):]
    transcript = "\n".join(f"{m.role}: {m.content}" for m in recent)
    messages = [
        ChatMessage(role="system", content=_REWRITE_SYSTEM_PROMPT),
        ChatMessage(role="user", content=f"Conversation so far:\n{transcript}\n\nFollow-up question: {question}"),
    ]
    try:
        response = await ai_gateway.chat(messages=messages, task=AITask.CHAT, identity=uid)
        rewritten = response.content.strip().strip('"')
        return rewritten or question
    except Exception as e:
        # A failed rewrite should never break retrieval — fall back to the raw
        # question rather than surfacing an error for what's an optimization.
        print(f"[rag.query_processing] rewrite failed, using raw question: {e}", flush=True)
        return question
