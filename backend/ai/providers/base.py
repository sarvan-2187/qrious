from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, Type

from pydantic import BaseModel

from ai.models import AIResponse, ChatMessage, StreamChunk


class LLMProvider(ABC):
    """Normalized interface every provider adapter implements. The gateway
    (gateway.py) only ever talks to this interface — it never imports a
    provider SDK directly, and never branches on provider name for anything
    except routing/config lookup."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
        response_model: Optional[Type[BaseModel]] = None,
    ) -> AIResponse:
        """Raises one of ai.exceptions.AIProviderError's subclasses on
        failure — never the underlying SDK's own exception type."""
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
    ) -> AsyncIterator[StreamChunk]:
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Cheap reachability probe — must NOT count against the caller's
        own token/rate-limit budget where the provider allows a lighter-weight
        check (see openai_compatible.py for what that looks like here)."""
        ...
