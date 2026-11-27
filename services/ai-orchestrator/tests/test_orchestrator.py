import asyncio
import httpx
from fastapi.testclient import TestClient
from app.adapters.providers import ProviderNotConfiguredError, RunwayAdapter
from app.config import Settings
from app.main import app
from app.models import ProviderSelectionRequest
from app.prompt_compiler import (
    CharacterContinuity,
    CompilePromptRequest,
    compile_cinematic_prompt,
)
from app.registry import select_best_provider

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "cineora-ai-orchestrator"
    assert body["status"] == "ok"


def test_providers_endpoint_honestly_reports_unconfigured_keys() -> None:
    response = client.get("/v1/providers")
    assert response.status_code == 200
    providers = response.json()
    assert len(providers) >= 4
    for provider in providers:
        assert "limitations" in provider
        assert len(provider["limitations"]) >= 1


def test_quality_first_selector_does_not_downgrade_cinema_master_4k() -> None:
    cfg = Settings(
        google_veo_api_key="",
        runway_api_key="test-runway-key",
        luma_api_key="test-luma-key",
    )
    req = ProviderSelectionRequest(
        qualityTier="CINEMA_MASTER",
        targetResolution="4K",
        onlyConfigured=True,
    )
    result = select_best_provider(req, cfg)
    assert result.selected is None
    assert result.downgraded is False


def test_quality_first_selector_picks_highest_visual_quality_for_4k() -> None:
    cfg = Settings(
        google_veo_api_key="test-veo-key",
        runway_api_key="test-runway-key",
    )
    req = ProviderSelectionRequest(
        qualityTier="CINEMA_MASTER",
        targetResolution="4K",
        requiresNativeAudio=True,
        onlyConfigured=True,
    )
    result = select_best_provider(req, cfg)
    assert result.selected is not None
    assert result.selected.providerId == "google-veo"
    assert result.downgraded is False


def test_cinematic_prompt_compiler_injects_camera_lighting_and_continuity() -> None:
    compiled = compile_cinematic_prompt(
        CompilePromptRequest(
            visualPrompt="A watchmaker inspects a tourbillon movement under a jeweler loupe.",
            shotType="CLOSE_UP",
            cameraMovement="DOLLY_IN",
            lightingPreset="CINEMATIC_CHIAROSCURO",
            targetResolution="4K",
            styleBibleNotes="Anamorphic 35mm film grain, warm amber highlights.",
            characters=[
                CharacterContinuity(
                    name="Elena",
                    appearanceNotes="Silver hair tied back, weathered skilled hands",
                    wardrobeNotes="Charcoal linen atelier coat",
                    referenceImageUrl="https://cdn.example.com/elena.png",
                )
            ],
        )
    )
    assert "4K" in compiled.positivePrompt
    assert "close-up" in compiled.positivePrompt.lower()
    assert "dolly-in" in compiled.positivePrompt.lower()
    assert "Elena" in compiled.positivePrompt
    assert "distorted face" in compiled.negativePrompt
    assert compiled.referenceImages == ["https://cdn.example.com/elena.png"]


def test_demo_mode_is_explicitly_labeled_and_live_mode_fails_honestly_without_keys() -> None:
    demo_resp = client.post(
        "/v1/generations/dispatch",
        json={
            "mode": "DEMO",
            "qualityTier": "HIGH",
            "targetResolution": "1080P",
            "visualPrompt": "Wide aerial shot gliding over emerald misty cliffs at sunrise.",
        },
    )
    assert demo_resp.status_code == 200
    demo_body = demo_resp.json()
    assert demo_body["mode"] == "DEMO"
    assert demo_body["isSimulated"] is True
    assert demo_body["providerJobId"].startswith("demo-")

    live_resp = client.post(
        "/v1/generations/dispatch",
        json={
            "mode": "LIVE",
            "qualityTier": "HIGH",
            "targetResolution": "1080P",
            "preferredProvider": "runway",
            "preferredModel": "gen-4-turbo",
            "visualPrompt": "Wide aerial shot gliding over emerald misty cliffs at sunrise.",
        },
    )
    assert live_resp.status_code == 503


def test_runway_adapter_sends_genuine_api_payload() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, json={"id": "rw_task_999"})

    transport = httpx.MockTransport(handler)

    async def _run() -> dict[str, object]:
        async with httpx.AsyncClient(transport=transport) as mock_client:
            adapter = RunwayAdapter(api_key="rw_secret_test", client=mock_client)
            return await adapter.submit_generation(
                {
                    "compiledPrompt": "Cinematic neon street in Tokyo rain",
                    "durationSeconds": 5,
                    "aspectRatio": "16:9",
                }
            )

    result = asyncio.run(_run())
    assert result["providerJobId"] == "rw_task_999"
    assert captured["url"] == "https://api.dev.runwayml.com/v1/text_to_video"
    assert captured["auth"] == "Bearer rw_secret_test"


def test_runway_adapter_raises_when_unconfigured() -> None:
    adapter = RunwayAdapter(api_key="")
    try:
        asyncio.run(adapter.submit_generation({"compiledPrompt": "Test prompt"}))
        assert False, "Expected ProviderNotConfiguredError"
    except ProviderNotConfiguredError:
        pass
