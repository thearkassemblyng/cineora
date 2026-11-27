# CINEORA — Development & Operations Runbook

## Prerequisites
- **Node.js** >= 20 and **npm**
- **Python** >= 3.12 (for `services/ai-orchestrator`)
- **Docker Desktop** (for PostgreSQL 16, Redis 7, MinIO S3, and containerized FFmpeg media worker)
- **FFmpeg & FFprobe** (if running `services/media-worker` outside Docker)
- **Flutter SDK** >= 3.22 / Dart >= 3.4 (for `apps/mobile`)

## 1. Environment Setup
```bash
cp .env.example .env
```
Fill in your local or staging secrets in `.env`. Never commit `.env` to Git.

## 2. Start Infrastructure (PostgreSQL, Redis, MinIO)
```bash
docker compose up -d postgres redis minio
```

## 3. TypeScript Monorepo (Contracts, API, Media Worker, Web)
```bash
npm install
npm run db:generate
npm run db:migrate
npm run build
npm run test
```

## 4. Python AI Orchestrator (`services/ai-orchestrator`)
```bash
cd services/ai-orchestrator
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --port 8000
```

## 5. Flutter Mobile Studio (`apps/mobile`)
```bash
cd apps/mobile
flutter pub get
flutter test
flutter run --dart-define=CINEORA_API_URL=http://10.0.2.2:4000/api/v1
```
