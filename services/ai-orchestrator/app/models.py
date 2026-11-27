from typing import Literal
from pydantic import BaseModel, Field

GenerationMode = Literal["LIVE", "DEMO"]
QualityTier = Literal["STANDARD", "HIGH", "CINEMA_MASTER"]
ResolutionPreset = Literal["1080P", "4K"]
AspectRatio = Literal["16:9", "9:16", "2.39:1", "1:1", "4:5"]
SpeedTier = Literal["FAST", "BALANCED", "CINEMA_SLOW"]


class ProviderCapability(BaseModel):
    providerId: str
    displayName: str
    modelId: str
    configured: bool
    maxResolution: ResolutionPreset
    supportedAspectRatios: list[AspectRatio]
    maxDurationSeconds: int = Field(gt=0)
    supportsLipSync: bool
    supportsNativeAudio: bool
    supportsCharacterReference: bool
    visualQualityScore: int = Field(ge=1, le=100)
    realismScore: int = Field(ge=1, le=100)
    motionQualityScore: int = Field(ge=1, le=100)
    speedTier: SpeedTier
    creditsPerSecond: float = Field(gt=0)
    limitations: list[str]


class ProviderSelectionRequest(BaseModel):
    qualityTier: QualityTier = "HIGH"
    targetResolution: ResolutionPreset = "1080P"
    aspectRatio: AspectRatio = "16:9"
    requiresLipSync: bool = False
    requiresNativeAudio: bool = False
    requiresCharacterReference: bool = False
    onlyConfigured: bool = False


class ProviderSelectionResponse(BaseModel):
    selected: ProviderCapability | None
    candidates: list[ProviderCapability]
    rationale: str
    downgraded: bool = False
