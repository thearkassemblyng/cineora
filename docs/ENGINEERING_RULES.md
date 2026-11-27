# CINEORA — Master Engineering Rules & Production Standards

## Part I: Master Engineering Rules

### 1. Project Identity
- **Project name:** CINEORA
- **Product:** AI-powered video production platform
- **Target market:** Global
- **Development environment:** Google Antigravity

### 2. Mandatory Technology Stack
- **Web:** Next.js, React, TypeScript
- **Mobile:** Flutter and Dart for Android and iOS
- **Backend:** NestJS and TypeScript
- **AI services:** Python and FastAPI
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Background jobs:** Redis and BullMQ
- **Video processing:** FFmpeg
- **Cloud infrastructure:** AWS
- **Media storage:** Amazon S3
- **Global delivery:** CloudFront
- **Containerization:** Docker

> Do not replace these selected technologies without explicit authorization.

### 3. Architecture Rules
- Maintain a monorepo.
- Use modular backend architecture.
- Separate AI orchestration from the core application backend.
- Keep video rendering and generation tasks asynchronous.
- Implement reusable AI provider adapters.
- Maintain shared API contracts.
- Use versioned APIs.
- Keep web and mobile applications connected to the same backend.
- Design for horizontal scalability.

### 4. Development Quality
- Write clean, maintainable, production-oriented code.
- Avoid duplicated business logic.
- Use strong typing.
- Implement proper error handling.
- Validate all incoming requests.
- Include database migrations.
- Provide environment variable templates.
- Never expose secret keys in frontend code.
- Never hardcode payment credentials or AI provider credentials.
- Include automated tests for important business functions.

### 5. AI Generation Rules
- Implement genuine provider API integrations.
- Never use static sample videos as substitutes for actual generation.
- Clearly distinguish demo mode from live generation.
- Track generation status and provider errors.
- Support individual scene regeneration.
- Maintain generation history.
- Implement credit reservation and reconciliation.
- Support multiple AI providers.

### 6. User Experience
- Deliver a premium, modern and responsive interface.
- Provide dedicated web and mobile experiences.
- Maintain consistent branding.
- Support loading, error, empty and success states.
- Make the video creation process intuitive.
- Provide clear generation progress.
- Ensure mobile accessibility.

### 7. Development Discipline
- Build incrementally.
- Test every major module.
- Do not mark a feature complete until it has been tested.
- Maintain project documentation.
- Never silently remove previously implemented functionality.
- Preserve existing working features when adding new modules.
- Report unavailable external integrations honestly.
- Keep the application deployable throughout development.

### 8. Delivery Standard
The objective is a real, functional, scalable AI video production platform, not merely a frontend prototype or static dashboard.

---

## Part II: Mandatory Video Quality, Visual Clarity & Cinematic Production Standards

CINEORA must be engineered to produce exceptionally clean, sharp, detailed, visually appealing and professionally finished videos. Video quality is one of the platform's highest priorities and must never be treated as an optional enhancement.

The platform must avoid the common weaknesses of low-quality AI-generated videos, including dull visuals, blurry images, poor lighting, washed-out colours, unrealistic human appearances, distorted faces, inconsistent characters, unnatural movements, poor lip synchronization, visual noise, flickering, frame inconsistencies and poorly rendered scenes.

### 1. Visual Excellence
- Prioritize high-definition, crisp and detailed visuals.
- Support the highest resolutions available from each integrated AI provider, including Full HD (1080p) and 4K where genuinely supported.
- Maintain sharpness, realistic textures, natural skin details and accurate object representation.
- Avoid unnecessary blur, pixelation, compression artifacts and visual noise.
- Produce rich, balanced and professionally graded colours.

### 2. Cinematic Production Quality
- Support professional cinematic lighting, exposure, contrast, depth of field and colour grading.
- Generate visually compelling camera movements, angles, framing and compositions.
- Support wide shots, close-ups, medium shots, tracking shots, aerial shots and other cinematic techniques.
- Maintain visual continuity between scenes.
- Ensure scenes have appropriate pacing, transitions and professional composition.

### 3. Realism and Motion Quality
- Prioritize natural human expressions, realistic body movements, accurate gestures and believable interactions.
- Minimize distorted faces, extra fingers, malformed limbs, unnatural movements and inconsistent objects.
- Maintain character identity, clothing, appearance and environment consistency across scenes.
- Support natural speech, accurate lip synchronization and believable voice delivery where the selected provider supports them.

### 4. Professional Audio Quality
- Produce clear, clean and intelligible narration, dialogue and voiceovers.
- Support appropriate voice levels, background music balancing, sound effects and audio mixing.
- Avoid distorted, noisy, muffled or poorly synchronized audio.
- Provide appropriate audio mastering and export options.

### 5. Intelligent Video Enhancement and Quality Control
- Introduce a video quality assessment pipeline that checks generated scenes for resolution, sharpness, flickering, audio synchronization, visual artifacts and other detectable quality problems.
- Where technically supported, provide upscaling, denoising, stabilization, frame interpolation and colour enhancement.
- Allow users to regenerate or improve individual scenes without recreating the entire project.
- Never advertise enhancement capabilities that are not actually implemented.

### 6. Quality-Preserving Video Rendering
- Use FFmpeg and appropriate professional encoding configurations to assemble scenes without unnecessarily degrading their original quality.
- Preserve the best available source resolution, frame rate, aspect ratio, colour information and audio quality.
- Provide export options suitable for professional advertising, filmmaking, television-style presentation and social media.
- Avoid excessive compression and unnecessary quality loss during rendering.

### 7. AI Provider Quality Selection
- Build a provider and model selection system that considers visual quality, realism, resolution, motion quality, audio capabilities, generation speed and cost.
- Do not automatically select a cheaper model when it would significantly compromise the requested production quality.
- Clearly disclose model limitations and supported output specifications.
- Allow users to select quality levels where supported.

### 8. Overall Production Standard
Every video generated by CINEORA should aim for a polished, professional production standard. The objective is not merely to create AI videos, but to provide users with a powerful production studio capable of producing compelling advertisements, cinematic stories, news presentations, documentaries and social media content with excellent visual and audio quality.

Quality must be considered throughout the entire production pipeline: **scripting, scene planning, generation, enhancement, editing, rendering and final export**.
