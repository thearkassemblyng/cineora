from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
import httpx
from app.adapters.base import AudioProviderAdapter, VideoProviderAdapter
from app.config import Settings


@asynccontextmanager
async def _http_client(
    injected: httpx.AsyncClient | None,
) -> AsyncIterator[httpx.AsyncClient]:
    if injected is not None:
        yield injected
        return
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client


class ProviderNotConfiguredError(RuntimeError):
    """Raised when LIVE generation is requested for a provider without configured API keys."""


class RunwayAdapter(VideoProviderAdapter):
    provider_id = "runway"
    model_id = "gen-4-turbo"
    base_url = "https://api.dev.runwayml.com/v1"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key.strip()
        self._client = client

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def submit_generation(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("RUNWAY_API_KEY is not configured on the server.")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "X-Runway-Version": "2024-11-06",
            "Content-Type": "application/json",
        }
        body = {
            "model": payload.get("model", self.model_id),
            "promptText": payload["compiledPrompt"],
            "duration": payload.get("durationSeconds", 5),
            "ratio": payload.get("aspectRatio", "16:9"),
        }
        if payload.get("seed") is not None:
            body["seed"] = payload["seed"]

        async with _http_client(self._client) as client:
            resp = await client.post(f"{self.base_url}/text_to_video", json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return {
                "provider": self.provider_id,
                "model": body["model"],
                "providerJobId": data.get("id"),
                "status": "DISPATCHED",
                "rawResponse": data,
            }

    async def poll_status(self, provider_job_id: str) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("RUNWAY_API_KEY is not configured on the server.")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "X-Runway-Version": "2024-11-06",
        }
        async with _http_client(self._client) as client:
            resp = await client.get(f"{self.base_url}/tasks/{provider_job_id}", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            raw_status = str(data.get("status", "PROCESSING")).upper()
            mapped = (
                "COMPLETED"
                if raw_status == "SUCCEEDED"
                else "FAILED"
                if raw_status in {"FAILED", "CANCELLED"}
                else "PROCESSING"
            )
            outputs = data.get("output") or []
            return {
                "providerJobId": provider_job_id,
                "status": mapped,
                "outputUrl": outputs[0] if isinstance(outputs, list) and outputs else None,
                "errorMessage": data.get("failure"),
            }

    def _get_client(self) -> httpx.AsyncClient:
        return self._client or httpx.AsyncClient(timeout=30.0)


class GoogleVeoAdapter(VideoProviderAdapter):
    provider_id = "google-veo"
    model_id = "veo-3-cinema"
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key.strip()
        self._client = client

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def submit_generation(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("GOOGLE_VEO_API_KEY is not configured on the server.")
        model = payload.get("model", self.model_id)
        body = {
            "instances": [
                {
                    "prompt": payload["compiledPrompt"],
                    "negativePrompt": payload.get("negativePrompt", ""),
                }
            ],
            "parameters": {
                "aspectRatio": payload.get("aspectRatio", "16:9"),
                "durationSeconds": payload.get("durationSeconds", 5),
                "resolution": payload.get("resolution", "1080P"),
            },
        }
        async with _http_client(self._client) as client:
            resp = await client.post(
                f"{self.base_url}/models/{model}:predictLongRunning",
                params={"key": self._api_key},
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "provider": self.provider_id,
                "model": model,
                "providerJobId": data.get("name"),
                "status": "DISPATCHED",
                "rawResponse": data,
            }

    async def poll_status(self, provider_job_id: str) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("GOOGLE_VEO_API_KEY is not configured on the server.")
        async with _http_client(self._client) as client:
            resp = await client.get(
                f"{self.base_url}/{provider_job_id}",
                params={"key": self._api_key},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("error"):
                return {
                    "providerJobId": provider_job_id,
                    "status": "FAILED",
                    "outputUrl": None,
                    "errorMessage": data["error"].get("message", "Provider generation failed"),
                }
            if data.get("done"):
                videos = (
                    data.get("response", {})
                    .get("generateVideoResponse", {})
                    .get("generatedSamples", [])
                )
                uri = videos[0].get("video", {}).get("uri") if videos else None
                return {
                    "providerJobId": provider_job_id,
                    "status": "COMPLETED",
                    "outputUrl": uri,
                    "errorMessage": None,
                }
            return {
                "providerJobId": provider_job_id,
                "status": "PROCESSING",
                "outputUrl": None,
                "errorMessage": None,
            }

    def _get_client(self) -> httpx.AsyncClient:
        return self._client or httpx.AsyncClient(timeout=30.0)


class KlingAdapter(VideoProviderAdapter):
    provider_id = "kling"
    model_id = "kling-2.0-master"
    base_url = "https://api.klingai.com/v1"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key.strip()
        self._client = client

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def submit_generation(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("KLING_API_KEY is not configured on the server.")
        headers = {"Authorization": f"Bearer {self._api_key}"}
        body = {
            "model_name": payload.get("model", self.model_id),
            "prompt": payload["compiledPrompt"],
            "negative_prompt": payload.get("negativePrompt", ""),
            "aspect_ratio": payload.get("aspectRatio", "16:9"),
            "duration": str(payload.get("durationSeconds", 5)),
            "mode": "pro",
        }
        async with _http_client(self._client) as client:
            resp = await client.post(f"{self.base_url}/videos/text2video", json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            task_id = (data.get("data") or {}).get("task_id")
            return {
                "provider": self.provider_id,
                "model": body["model_name"],
                "providerJobId": task_id,
                "status": "DISPATCHED",
                "rawResponse": data,
            }

    async def poll_status(self, provider_job_id: str) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("KLING_API_KEY is not configured on the server.")
        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with _http_client(self._client) as client:
            resp = await client.get(
                f"{self.base_url}/videos/text2video/{provider_job_id}", headers=headers
            )
            resp.raise_for_status()
            data = resp.json().get("data") or {}
            status_raw = str(data.get("task_status", "processing")).lower()
            mapped = (
                "COMPLETED"
                if status_raw == "succeed"
                else "FAILED"
                if status_raw == "failed"
                else "PROCESSING"
            )
            videos = (data.get("task_result") or {}).get("videos") or []
            return {
                "providerJobId": provider_job_id,
                "status": mapped,
                "outputUrl": videos[0].get("url") if videos else None,
                "errorMessage": data.get("task_status_msg") if mapped == "FAILED" else None,
            }

    def _get_client(self) -> httpx.AsyncClient:
        return self._client or httpx.AsyncClient(timeout=30.0)


class LumaAdapter(VideoProviderAdapter):
    provider_id = "luma"
    model_id = "ray-2"
    base_url = "https://api.lumalabs.ai/dream-machine/v1"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key.strip()
        self._client = client

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def submit_generation(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("LUMA_API_KEY is not configured on the server.")
        headers = {"Authorization": f"Bearer {self._api_key}"}
        body = {
            "model": payload.get("model", self.model_id),
            "prompt": payload["compiledPrompt"],
            "aspect_ratio": payload.get("aspectRatio", "16:9"),
            "resolution": "1080p",
        }
        async with _http_client(self._client) as client:
            resp = await client.post(f"{self.base_url}/generations", json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return {
                "provider": self.provider_id,
                "model": body["model"],
                "providerJobId": data.get("id"),
                "status": "DISPATCHED",
                "rawResponse": data,
            }

    async def poll_status(self, provider_job_id: str) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("LUMA_API_KEY is not configured on the server.")
        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with _http_client(self._client) as client:
            resp = await client.get(f"{self.base_url}/generations/{provider_job_id}", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            state = str(data.get("state", "dreaming")).lower()
            mapped = (
                "COMPLETED"
                if state == "completed"
                else "FAILED"
                if state == "failed"
                else "PROCESSING"
            )
            return {
                "providerJobId": provider_job_id,
                "status": mapped,
                "outputUrl": (data.get("assets") or {}).get("video"),
                "errorMessage": data.get("failure_reason"),
            }

    def _get_client(self) -> httpx.AsyncClient:
        return self._client or httpx.AsyncClient(timeout=30.0)


class ElevenLabsAudioAdapter(AudioProviderAdapter):
    provider_id = "elevenlabs"
    base_url = "https://api.elevenlabs.io/v1"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key.strip()
        self._client = client

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def synthesize_speech(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ProviderNotConfiguredError("ELEVENLABS_API_KEY is not configured on the server.")
        voice_id = payload.get("voiceId", "21m00Tcm4TlvDq8ikWAM")
        headers = {"xi-api-key": self._api_key, "Accept": "audio/mpeg"}
        body = {
            "text": payload["text"],
            "model_id": payload.get("modelId", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.8},
        }
        async with _http_client(self._client) as client:
            resp = await client.post(
                f"{self.base_url}/text-to-speech/{voice_id}", json=body, headers=headers
            )
            resp.raise_for_status()
            return {
                "provider": self.provider_id,
                "voiceId": voice_id,
                "contentType": resp.headers.get("content-type", "audio/mpeg"),
                "byteLength": len(resp.content),
            }


def build_video_adapters(cfg: Settings) -> dict[str, VideoProviderAdapter]:
    return {
        "google-veo": GoogleVeoAdapter(cfg.google_veo_api_key),
        "runway": RunwayAdapter(cfg.runway_api_key),
        "kling": KlingAdapter(cfg.kling_api_key),
        "luma": LumaAdapter(cfg.luma_api_key),
    }
