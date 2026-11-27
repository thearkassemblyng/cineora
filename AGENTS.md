# CINEORA — Workspace Engineering & Video Quality Rules

These rules are mandatory for every task, module, and session in the CINEORA repository. Do not deviate from them without explicit user authorization.

## 1. Project Identity
- **Project Name:** CINEORA
- **Product:** AI-powered video production platform (global market)
- **Objective:** A real, functional, scalable production studio — never a frontend-only prototype or static dashboard.

## 2. Mandatory Technology Stack
Do not replace any of these technologies without explicit authorization:
- **Web:** Next.js, React, TypeScript
- **Mobile:** Flutter and Dart (Android & iOS)
- **Backend:** NestJS and TypeScript
- **AI Services:** Python and FastAPI
- **Database:** PostgreSQL with Prisma ORM
- **Background Jobs:** Redis and BullMQ
- **Video Processing:** FFmpeg
- **Cloud Infrastructure:** AWS (Amazon S3 for media storage, CloudFront for global delivery)
- **Containerization:** Docker

## 3. Architecture Rules
- Maintain a single **monorepo**.
- Use **modular backend architecture** in NestJS with **versioned APIs** (`/api/v1/...`).
- Separate **AI orchestration** (`services/ai-orchestrator`, Python/FastAPI) from the **core application backend** (`apps/api`, NestJS).
- Keep all **video generation, QC, enhancement, and rendering tasks asynchronous** via Redis + BullMQ.
- Implement **reusable, provider-agnostic AI provider adapters**.
- Maintain **shared API contracts** (`packages/contracts`) so Web, Mobile, Backend, and AI services stay aligned.
- Connect both **Web and Mobile** applications to the same backend.
- Design stateless services for **horizontal scalability**.

## 4. Development Quality & Security
- Write clean, maintainable, strongly typed, production-oriented code; avoid duplicated business logic.
- Validate all incoming requests (DTOs/Zod/Pydantic) and implement consistent structured error handling.
- Always include Prisma database migrations and `.env.example` environment variable templates.
- **Never** expose secret keys in frontend/mobile code.
- **Never** hardcode payment credentials or AI provider credentials.
- Include automated tests for all important business functions.
- Never silently remove previously implemented functionality; preserve working features when adding new modules.
- Do not mark a feature complete until it has been tested.
- Report unavailable external integrations or missing credentials honestly.
- Keep the application deployable throughout development.

## 5. AI Generation & Credit Rules
- Implement **genuine provider API integrations** — never substitute static sample videos for actual AI generation.
- Clearly distinguish **Demo Mode** from **Live Generation** in API responses, database records, and UI.
- Track full generation status, provider job IDs, provider errors, and complete generation history.
- Support **individual scene regeneration** without recreating the entire project.
- Implement **credit reservation and reconciliation** (reserve on enqueue, settle on success, refund on failure/cancellation).
- Support multiple AI providers and models.

## 6. Mandatory Video Quality, Visual Clarity & Cinematic Standards
Video quality is a top priority across scripting, scene planning, generation, enhancement, editing, rendering, and export:
- **Visual Excellence:** Prioritize crisp, high-definition output (1080p and 4K where genuinely supported by the provider), realistic textures, natural skin details, rich colour grading, and minimal blur, noise, or compression artifacts.
- **Cinematic Production:** Support camera movements, shot types (wide, medium, close-up, tracking, aerial), lighting, exposure, depth of field, colour grading, pacing, transitions, and cross-scene visual continuity.
- **Realism & Motion:** Prioritize natural expressions, realistic movement, character/clothing/environment consistency across scenes, and accurate lip synchronization where supported by the provider.
- **Professional Audio:** Produce clean narration, dialogue, and voiceovers with balanced music/SFX mixing, loudness mastering, and tight A/V sync.
- **Automated Video QC & Honest Enhancement:** Inspect generated scenes for resolution, sharpness, flicker, artifacts, and A/V sync. Only expose enhancement features (upscaling, denoising, stabilization, frame interpolation, colour enhancement) that are genuinely implemented — never advertise unimplemented capabilities.
- **Quality-Preserving FFmpeg Rendering:** Preserve source resolution, frame rate, aspect ratio, colour space, and audio quality during assembly; provide export presets for cinema/film, advertising/broadcast, web, and social media without unnecessary quality degradation.
- **Quality-First Provider Selection:** Consider visual quality, realism, resolution, motion, audio, speed, and cost. Never automatically downgrade to a cheaper model if it significantly compromises requested quality. Clearly disclose model limitations and supported output specs.

## 7. User Experience
- Deliver a premium, modern, responsive web experience and a dedicated, accessible mobile experience with consistent branding.
- Support loading, error, empty, and success states everywhere.
- Provide intuitive video creation flows and clear real-time generation/render progress.

See `docs/ENGINEERING_RULES.md` for the full canonical specification and `docs/ARCHITECTURE.md` for the system design.
