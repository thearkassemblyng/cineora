from pydantic import BaseModel, Field


class CharacterContinuity(BaseModel):
    name: str
    appearanceNotes: str
    wardrobeNotes: str | None = None
    referenceImageUrl: str | None = None


class CompilePromptRequest(BaseModel):
    visualPrompt: str = Field(min_length=10)
    shotType: str = "MEDIUM"
    cameraMovement: str = "TRACKING"
    lightingPreset: str = "NATURAL_GOLDEN_HOUR"
    aspectRatio: str = "16:9"
    targetResolution: str = "1080P"
    colorProfile: str = "REC709_FILMIC"
    styleBibleNotes: str | None = None
    continuityNotes: str | None = None
    characters: list[CharacterContinuity] = Field(default_factory=list)


class CompiledPrompt(BaseModel):
    positivePrompt: str
    negativePrompt: str
    referenceImages: list[str]


SHOT_DESCRIPTIONS = {
    "WIDE": "expansive wide cinematic shot with deep environmental detail",
    "MEDIUM": "balanced medium cinematic shot with natural subject framing",
    "CLOSE_UP": "intimate close-up shot with crisp facial micro-details and shallow depth of field",
    "EXTREME_CLOSE_UP": "macro extreme close-up capturing fine skin and surface textures",
    "ESTABLISHING": "sweeping establishing shot grounding spatial geography and atmosphere",
    "OVER_THE_SHOULDER": "over-the-shoulder narrative framing maintaining eye-line continuity",
    "AERIAL": "high-definition aerial cinematography with smooth horizon stability",
    "LOW_ANGLE": "dramatic low-angle composition emphasizing scale and presence",
    "HIGH_ANGLE": "elevated high-angle perspective with clean geometric composition",
}

CAMERA_DESCRIPTIONS = {
    "STATIC": "locked-off tripod stability with subtle atmospheric life",
    "PAN": "smooth controlled horizontal pan with zero motion jitter",
    "TILT": "fluid vertical tilt revealing composition cleanly",
    "DOLLY_IN": "steady cinema dolly-in with natural optical perspective shift",
    "DOLLY_OUT": "controlled dolly-out widening the frame smoothly",
    "TRACKING": "stabilized gimbal tracking shot following subject motion naturally",
    "CRANE": "sweeping crane movement with cinema-grade stabilization",
    "HANDHELD_SUBTLE": "subtle documentary handheld realism without disorienting shake",
    "DRONE_ORBIT": "smooth orbital aerial tracking with crisp horizon lock",
}

LIGHTING_DESCRIPTIONS = {
    "NATURAL_GOLDEN_HOUR": "warm golden-hour sunlight, soft directional rim light, rich dynamic range",
    "CINEMATIC_CHIAROSCURO": "sculpted chiaroscuro key lighting, controlled deep shadows, filmic contrast",
    "STUDIO_SOFTBOX": "clean commercial studio softbox lighting, accurate natural skin tones",
    "NEON_NOIR": "atmospheric neon-noir lighting, specular wet reflections, rich color separation",
    "OVERCAST_DIFFUSED": "soft overcast diffused daylight with clean shadow transitions",
    "HIGH_KEY_COMMERCIAL": "bright high-key broadcast lighting, crisp highlights, vibrant balanced color",
}

DEFAULT_NEGATIVE_GUARD = (
    "blurry, out of focus, low resolution, compression artifacts, pixelation, "
    "visual noise, flickering frames, temporal inconsistency, distorted face, "
    "malformed hands, extra fingers, unnatural anatomy, washed-out colors, "
    "flat lighting, plastic skin, watermark, text overlay"
)


def compile_cinematic_prompt(req: CompilePromptRequest) -> CompiledPrompt:
    """Compile structured scene, camera, lighting, and character continuity into a cinema-grade prompt."""
    shot_desc = SHOT_DESCRIPTIONS.get(req.shotType, req.shotType.lower().replace("_", " "))
    cam_desc = CAMERA_DESCRIPTIONS.get(
        req.cameraMovement, req.cameraMovement.lower().replace("_", " ")
    )
    light_desc = LIGHTING_DESCRIPTIONS.get(
        req.lightingPreset, req.lightingPreset.lower().replace("_", " ")
    )

    parts = [
        f"Ultra-sharp {req.targetResolution} cinema production ({req.aspectRatio}, {req.colorProfile} color grade).",
        f"Shot & framing: {shot_desc}; camera movement: {cam_desc}.",
        f"Lighting & mood: {light_desc}.",
        f"Scene action: {req.visualPrompt.strip()}",
    ]

    if req.styleBibleNotes:
        parts.append(f"Project style bible: {req.styleBibleNotes.strip()}")

    reference_images: list[str] = []
    if req.characters:
        char_specs = []
        for c in req.characters:
            spec = f"{c.name} ({c.appearanceNotes.strip()}"
            if c.wardrobeNotes:
                spec += f"; wardrobe: {c.wardrobeNotes.strip()}"
            spec += ")"
            char_specs.append(spec)
            if c.referenceImageUrl:
                reference_images.append(c.referenceImageUrl)
        parts.append("Character continuity lock: " + " | ".join(char_specs))

    if req.continuityNotes:
        parts.append(f"Cross-scene continuity: {req.continuityNotes.strip()}")

    parts.append(
        "Prioritize natural human expressions, realistic textures, rich color depth, and fluid motion."
    )

    return CompiledPrompt(
        positivePrompt=" ".join(parts),
        negativePrompt=DEFAULT_NEGATIVE_GUARD,
        referenceImages=reference_images,
    )
