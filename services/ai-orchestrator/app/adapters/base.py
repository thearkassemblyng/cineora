from abc import ABC, abstractmethod
from typing import Any


class VideoProviderAdapter(ABC):
    """Provider-agnostic interface for live AI video generation providers."""

    provider_id: str
    model_id: str

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True only when required server-side credentials are present."""

    @abstractmethod
    async def submit_generation(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Submit a real generation job to the provider and return provider job metadata."""

    @abstractmethod
    async def poll_status(self, provider_job_id: str) -> dict[str, Any]:
        """Fetch live job status, output asset URL, or structured provider error."""


class AudioProviderAdapter(ABC):
    """Provider-agnostic interface for narration, dialogue, and voiceover generation."""

    provider_id: str

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True only when required server-side credentials are present."""

    @abstractmethod
    async def synthesize_speech(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Generate high-clarity speech audio from script narration/dialogue."""
