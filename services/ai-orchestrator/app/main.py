from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from app.adapters.providers import ProviderNotConfiguredError, build_video_adapters
from app.config import settings
from app.models import (
    GenerationMode,
    ProviderCapability,
    ProviderSelectionRequest,
    ProviderSelectionResponse,
    QualityTier,
    ResolutionPreset,
)
from app.prompt_compiler import (
    CharacterContinuity,
    CompiledPrompt,
    CompilePromptRequest,
    compile_cinematic_prompt,
)
from app.registry import list_provider_capabilities, select_best_provider

app = FastAPI(
    title="CINEORA AI Orchestrator",
    version=settings.version,
    description="Provider-agnostic AI video/audio orchestration and quality-first model selector.",
)


class DispatchGenerationRequest(BaseModel):
    mode: GenerationMode = "LIVE"
    qualityTier: QualityTier = "HIGH"
    targetResolution: ResolutionPreset = "1080P"
    aspectRatio: str = "16:9"
    durationSeconds: int = Field(default=5, ge=2, le=30)
    preferredProvider: str | None = None
    preferredModel: str | None = None
    requiresLipSync: bool = False
    requiresNativeAudio: bool = False
    seed: int | None = None
    visualPrompt: str = Field(min_length=10)
    shotType: str = "MEDIUM"
    cameraMovement: str = "TRACKING"
    lightingPreset: str = "NATURAL_GOLDEN_HOUR"
    colorProfile: str = "REC709_FILMIC"
    styleBibleNotes: str | None = None
    continuityNotes: str | None = None
    characters: list[CharacterContinuity] = Field(default_factory=list)


class DispatchGenerationResponse(BaseModel):
    mode: GenerationMode
    isSimulated: bool
    provider: str
    model: str
    providerJobId: str
    status: str
    compiledPrompt: str
    negativePrompt: str
    notice: str | None = None


@app.get("/v1/health")
def health() -> dict[str, object]:
    providers = list_provider_capabilities(settings)
    configured_count = sum(1 for p in providers if p.configured)
    return {
        "service": settings.service_name,
        "status": "ok",
        "version": settings.version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "defaultMode": settings.ai_default_mode,
        "configuredProviders": configured_count,
    }


@app.get("/v1/providers", response_model=list[ProviderCapability])
def get_providers() -> list[ProviderCapability]:
    return list_provider_capabilities(settings)


@app.post("/v1/providers/select", response_model=ProviderSelectionResponse)
def select_provider(request: ProviderSelectionRequest) -> ProviderSelectionResponse:
    return select_best_provider(request, settings)


@app.post("/v1/prompts/compile", response_model=CompiledPrompt)
def compile_prompt(request: CompilePromptRequest) -> CompiledPrompt:
    return compile_cinematic_prompt(request)


@app.post("/v1/generations/dispatch", response_model=DispatchGenerationResponse)
async def dispatch_generation(
    request: DispatchGenerationRequest,
) -> DispatchGenerationResponse:
    compiled = compile_cinematic_prompt(
        CompilePromptRequest(
            visualPrompt=request.visualPrompt,
            shotType=request.shotType,
            cameraMovement=request.cameraMovement,
            lightingPreset=request.lightingPreset,
            aspectRatio=request.aspectRatio,
            targetResolution=request.targetResolution,
            colorProfile=request.colorProfile,
            styleBibleNotes=request.styleBibleNotes,
            continuityNotes=request.continuityNotes,
            characters=request.characters,
        )
    )

    selection = select_best_provider(
        ProviderSelectionRequest(
            qualityTier=request.qualityTier,
            targetResolution=request.targetResolution,
            aspectRatio=request.aspectRatio,  # type: ignore[arg-type]
            requiresLipSync=request.requiresLipSync,
            requiresNativeAudio=request.requiresNativeAudio,
            onlyConfigured=(request.mode == "LIVE" and request.preferredProvider is None),
        ),
        settings,
    )

    chosen_provider = request.preferredProvider or (
        selection.selected.providerId if selection.selected else None
    )
    chosen_model = request.preferredModel or (
        selection.selected.modelId if selection.selected else None
    )

    if not chosen_provider or not chosen_model:
        raise HTTPException(
            status_code=422,
            detail=(
                "No configured provider satisfies the requested quality tier and specs "
                "without downgrading quality. Configure a compatible provider API key or use DEMO mode."
            ),
        )

    # Strict DEMO vs LIVE separation: DEMO is explicitly marked simulated and never returns fake videos
    if request.mode == "DEMO":
        return DispatchGenerationResponse(
            mode="DEMO",
            isSimulated=True,
            provider=chosen_provider,
            model=chosen_model,
            providerJobId=f"demo-{uuid4().hex[:12]}",
            status="COMPLETED",
            compiledPrompt=compiled.positivePrompt,
            negativePrompt=compiled.negativePrompt,
            notice=(
                "DEMO MODE dry-run only: no external AI provider was billed and no static sample "
                "video was substituted. Configure live provider keys and switch mode to LIVE for real video generation."
            ),
        )

    adapters = build_video_adapters(settings)
    adapter = adapters.get(chosen_provider)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {chosen_provider}")

    try:
        live_result = await adapter.submit_generation(
            {
                "model": chosen_model,
                "compiledPrompt": compiled.positivePrompt,
                "negativePrompt": compiled.negativePrompt,
                "aspectRatio": request.aspectRatio,
                "durationSeconds": request.durationSeconds,
                "resolution": request.targetResolution,
                "seed": request.seed,
                "referenceImages": compiled.referenceImages,
            }
        )
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Live provider dispatch failed: {exc}"
        ) from exc

    return DispatchGenerationResponse(
        mode="LIVE",
        isSimulated=False,
        provider=chosen_provider,
        model=chosen_model,
        providerJobId=str(live_result.get("providerJobId") or ""),
        status=str(live_result.get("status") or "DISPATCHED"),
        compiledPrompt=compiled.positivePrompt,
        negativePrompt=compiled.negativePrompt,
    )


@app.get("/v1/generations/{provider_id}/{provider_job_id:path}")
async def poll_generation(provider_id: str, provider_job_id: str) -> dict[str, object]:
    if provider_job_id.startswith("demo-"):
        return {
            "providerJobId": provider_job_id,
            "mode": "DEMO",
            "isSimulated": True,
            "status": "COMPLETED",
            "outputUrl": None,
            "errorMessage": None,
        }

    adapters = build_video_adapters(settings)
    adapter = adapters.get(provider_id)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider_id}")
    try:
        return await adapter.poll_status(provider_job_id)
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Provider poll failed: {exc}") from exc
