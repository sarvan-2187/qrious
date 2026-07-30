"""Builds the set of provider adapters actually usable right now — only
providers with a configured API key, per the task spec's §8: a missing key
means that provider is skipped, never a startup crash.
"""
from __future__ import annotations

from ai.config import AI_CONNECT_TIMEOUT_SECONDS, AI_REQUEST_TIMEOUT_SECONDS, ProviderConfig
from ai.providers.base import LLMProvider
from ai.providers.gemini import GeminiProvider
from ai.providers.groq import GroqProvider
from ai.providers.kimi import KimiProvider
from ai.providers.mistral import MistralProvider
from ai.providers.nvidia import NvidiaProvider
from ai.providers.vllm import VLLMProvider
from ai.providers.zai import ZaiProvider

PROVIDER_CLASSES: dict[str, type] = {
    "groq": GroqProvider,
    "gemini": GeminiProvider,
    "mistral": MistralProvider,
    "nvidia": NvidiaProvider,
    "kimi": KimiProvider,
    "zai": ZaiProvider,
    "vllm": VLLMProvider,
}


def build_providers(provider_configs: dict[str, ProviderConfig]) -> dict[str, LLMProvider]:
    providers: dict[str, LLMProvider] = {}
    for name, provider_cls in PROVIDER_CLASSES.items():
        config = provider_configs.get(name)
        if config is None or not config.enabled:
            print(f"[AI Gateway] provider '{name}' disabled (no API key configured)", flush=True)
            continue
        try:
            providers[name] = provider_cls(config, AI_REQUEST_TIMEOUT_SECONDS, AI_CONNECT_TIMEOUT_SECONDS)
            print(f"[AI Gateway] provider '{name}' enabled (default model: {config.default_model})", flush=True)
        except Exception as exc:  # never let one bad provider config block startup
            print(f"[AI Gateway] provider '{name}' failed to initialize, skipping: {type(exc).__name__}: {exc}", flush=True)
    return providers
