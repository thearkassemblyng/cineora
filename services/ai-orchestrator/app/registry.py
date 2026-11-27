from app.config import Settings
from app.models import (
    ProviderCapability,
    ProviderSelectionRequest,
    ProviderSelectionResponse,
)

QUALITY_TIER_MIN_VISUAL_SCORE = {
    "STANDARD": 75,
    "HIGH": 88,
    "CINEMA_MASTER": 93,
}


def list_provider_capabilities(cfg: Settings) -> list[ProviderCapability]:
    """Return honest capabilities, specs, configuration state, and limitations for each model."""
    return [
        ProviderCapability(
            providerId="google-veo",
            displayName="Google Veo",
            modelId="veo-3-cinema",
            configured=bool(cfg.google_veo_api_key.strip()),
            maxResolution="4K",
            supportedAspectRatios=["16:9", "9:16", "2.39:1"],
            maxDurationSeconds=10,
            supportsLipSync=True,
            supportsNativeAudio=True,
            supportsCharacterReference=True,
            visualQualityScore=96,
            realismScore=95,
            motionQualityScore=95,
            speedTier="CINEMA_SLOW",
            creditsPerSecond=12.0,
            limitations=[
                "Higher credit cost per second; longer queue times during peak load.",
                "4K output requires provider-side 4K entitlement on the configured API key.",
            ],
        ),
        ProviderCapability(
            providerId="runway",
            displayName="Runway",
            modelId="gen-4-turbo",
            configured=bool(cfg.runway_api_key.strip()),
            maxResolution="1080P",
            supportedAspectRatios=["16:9", "9:16", "1:1", "4:5"],
            maxDurationSeconds=10,
            supportsLipSync=False,
            supportsNativeAudio=False,
            supportsCharacterReference=True,
            visualQualityScore=92,
            realismScore=91,
            motionQualityScore=93,
            speedTier="BALANCED",
            creditsPerSecond=8.0,
            limitations=[
                "Native output capped at 1080p; requires separate audio/lip-sync track.",
                "Complex multi-person dialogue scenes may require reference keyframes.",
            ],
        ),
        ProviderCapability(
            providerId="kling",
            displayName="Kling AI",
            modelId="kling-2.0-master",
            configured=bool(cfg.kling_api_key.strip()),
            maxResolution="1080P",
            supportedAspectRatios=["16:9", "9:16", "1:1"],
            maxDurationSeconds=10,
            supportsLipSync=True,
            supportsNativeAudio=False,
            supportsCharacterReference=True,
            visualQualityScore=91,
            realismScore=90,
            motionQualityScore=92,
            speedTier="BALANCED",
            creditsPerSecond=7.5,
            limitations=[
                "Native output capped at 1080p.",
                "Lip-sync requires a separate post-pass with clean narration audio.",
            ],
        ),
        ProviderCapability(
            providerId="luma",
            displayName="Luma Dream Machine",
            modelId="ray-2",
            configured=bool(cfg.luma_api_key.strip()),
            maxResolution="1080P",
            supportedAspectRatios=["16:9", "9:16", "2.39:1", "1:1"],
            maxDurationSeconds=9,
            supportsLipSync=False,
            supportsNativeAudio=False,
            supportsCharacterReference=True,
            visualQualityScore=89,
            realismScore=88,
            motionQualityScore=90,
            speedTier="FAST",
            creditsPerSecond=6.0,
            limitations=[
                "Native output capped at 1080p; no native speech or lip-sync.",
            ],
        ),
    ]


def select_best_provider(
    req: ProviderSelectionRequest,
    cfg: Settings,
) -> ProviderSelectionResponse:
    """
    Quality-first provider selection.
    Never silently downgrades to a lower-quality model that fails the requested quality tier
    or hard capability requirements (4K, lip-sync, native audio, aspect ratio).
    """
    all_providers = list_provider_capabilities(cfg)
    min_visual = QUALITY_TIER_MIN_VISUAL_SCORE[req.qualityTier]

    eligible: list[ProviderCapability] = []
    for p in all_providers:
        if req.onlyConfigured and not p.configured:
            continue
        if req.targetResolution == "4K" and p.maxResolution != "4K":
            continue
        if req.aspectRatio not in p.supportedAspectRatios:
            continue
        if req.requiresLipSync and not p.supportsLipSync:
            continue
        if req.requiresNativeAudio and not p.supportsNativeAudio:
            continue
        if req.requiresCharacterReference and not p.supportsCharacterReference:
            continue
        if p.visualQualityScore < min_visual:
            continue
        eligible.append(p)

    # Quality-first ranking: visual clarity + realism + motion quality dominate over cost
    ranked = sorted(
        eligible,
        key=lambda p: (
            p.visualQualityScore * 0.45
            + p.realismScore * 0.30
            + p.motionQualityScore * 0.25
        ),
        reverse=True,
    )

    if not ranked:
        return ProviderSelectionResponse(
            selected=None,
            candidates=[],
            rationale=(
                "No provider satisfies all requested quality and capability requirements "
                "without compromising requested production quality."
            ),
            downgraded=False,
        )

    winner = ranked[0]
    return ProviderSelectionResponse(
        selected=winner,
        candidates=ranked,
        rationale=(
            f"Selected {winner.displayName} ({winner.modelId}) for {req.qualityTier} quality "
            f"at {req.targetResolution} ({req.aspectRatio}) with visual score {winner.visualQualityScore}/100."
        ),
        downgraded=False,
    )
