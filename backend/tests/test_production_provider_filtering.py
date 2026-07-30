# backend/tests/test_production_provider_filtering.py
import importlib
import os
from unittest.mock import patch

import app_env
import services.qbraid_service as qbraid_service_module
import services.quantum_providers as quantum_providers
import services.quantum_providers.base as providers_base


def _reload_with(app_env_value: str | None):
    """APP_ENV is read once at import time, so every module that copied the flag
    has to be re-imported, in dependency order, to observe a different
    environment."""
    env = {k: v for k, v in os.environ.items() if k != "APP_ENV"}
    if app_env_value is not None:
        env["APP_ENV"] = app_env_value
    with patch.dict(os.environ, env, clear=True), patch.object(app_env, "load_dotenv"):
        importlib.reload(app_env)
        importlib.reload(providers_base)
        return importlib.reload(qbraid_service_module), importlib.reload(quantum_providers)


def _sim_only(qbraid_module) -> bool:
    ids = qbraid_module._CURATED_DEVICE_IDS
    return all("sim:" in d for d in ids) and len(ids) > 0


def test_production_hides_iqm_and_qbraid_qpus():
    qbraid, providers = _reload_with("production")
    assert "iqm" not in providers.PROVIDER_REGISTRY
    assert qbraid.IS_PRODUCTION
    # The curated list itself is untouched; list_devices() is what filters —
    # assert on the same predicate it applies.
    assert [d for d in qbraid._CURATED_DEVICE_IDS if "sim:" in d] == ["ionq:ionq:sim:simulator"]


def test_local_shows_everything():
    qbraid, providers = _reload_with(None)
    assert "iqm" in providers.PROVIDER_REGISTRY
    assert not qbraid.IS_PRODUCTION
    assert not _sim_only(qbraid)


if __name__ == "__main__":
    test_production_hides_iqm_and_qbraid_qpus()
    test_local_shows_everything()
    print("ok")
