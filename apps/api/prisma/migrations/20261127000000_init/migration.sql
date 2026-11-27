-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'PRODUCER', 'ADMIN');
CREATE TYPE "CreditTransactionType" AS ENUM ('TOPUP', 'RESERVE', 'SETTLE', 'REFUND');
CREATE TYPE "ProjectFormat" AS ENUM ('CINEMATIC_FILM', 'ADVERTISEMENT', 'NEWS_BROADCAST', 'DOCUMENTARY', 'SOCIAL_MEDIA');
CREATE TYPE "ResolutionPreset" AS ENUM ('P1080', 'UHD_4K');
CREATE TYPE "GenerationMode" AS ENUM ('LIVE', 'DEMO');
CREATE TYPE "QualityTier" AS ENUM ('STANDARD', 'HIGH', 'CINEMA_MASTER');
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'DISPATCHED', 'PROCESSING', 'QC_PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AudioTrackType" AS ENUM ('VOICEOVER', 'DIALOGUE', 'MUSIC', 'SFX');
CREATE TYPE "ExportPreset" AS ENUM ('CINEMA_4K', 'BROADCAST_1080P', 'WEB_MASTER', 'SOCIAL_9_16');
CREATE TYPE "RenderStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CREATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "reservedCredits" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "format" "ProjectFormat" NOT NULL DEFAULT 'CINEMATIC_FILM',
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "targetResolution" "ResolutionPreset" NOT NULL DEFAULT 'P1080',
    "targetFps" INTEGER NOT NULL DEFAULT 24,
    "colorProfile" TEXT NOT NULL DEFAULT 'REC709_FILMIC',
    "styleBibleNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CharacterAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appearanceNotes" TEXT NOT NULL,
    "wardrobeNotes" TEXT,
    "referenceImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scriptNarration" TEXT,
    "visualPrompt" TEXT NOT NULL,
    "shotType" TEXT NOT NULL DEFAULT 'MEDIUM',
    "cameraMovement" TEXT NOT NULL DEFAULT 'TRACKING',
    "lightingPreset" TEXT NOT NULL DEFAULT 'NATURAL_GOLDEN_HOUR',
    "durationSeconds" INTEGER NOT NULL DEFAULT 5,
    "continuityNotes" TEXT,
    "activeGenerationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "mode" "GenerationMode" NOT NULL DEFAULT 'LIVE',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "qualityTier" "QualityTier" NOT NULL DEFAULT 'HIGH',
    "resolution" TEXT NOT NULL DEFAULT '1080P',
    "fps" INTEGER NOT NULL DEFAULT 24,
    "seed" INTEGER,
    "compiledPrompt" TEXT NOT NULL,
    "providerJobId" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "rawAssetKey" TEXT,
    "enhancedAssetKey" TEXT,
    "creditReservationId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" DOUBLE PRECISION NOT NULL,
    "bitrateKbps" INTEGER,
    "sharpnessScore" DOUBLE PRECISION NOT NULL,
    "flickerScore" DOUBLE PRECISION NOT NULL,
    "avSyncOffsetMs" DOUBLE PRECISION NOT NULL,
    "artifactFlags" TEXT[],
    "passed" BOOLEAN NOT NULL,
    "recommendations" TEXT[],
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AudioTrack" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneId" TEXT,
    "type" "AudioTrackType" NOT NULL,
    "provider" TEXT,
    "voiceId" TEXT,
    "gainDb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startOffsetMs" INTEGER NOT NULL DEFAULT 0,
    "assetKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudioTrack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "exportPreset" "ExportPreset" NOT NULL DEFAULT 'WEB_MASTER',
    "loudnessTargetLufs" DOUBLE PRECISION NOT NULL DEFAULT -14,
    "status" "RenderStatus" NOT NULL DEFAULT 'QUEUED',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "outputAssetKey" TEXT,
    "cdnUrl" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- Indexes & Foreign Keys
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE UNIQUE INDEX "CreditWallet_userId_key" ON "CreditWallet"("userId");
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");
CREATE INDEX "CreditTransaction_walletId_createdAt_idx" ON "CreditTransaction"("walletId", "createdAt");
CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt");
CREATE INDEX "CharacterAsset_projectId_idx" ON "CharacterAsset"("projectId");
CREATE INDEX "Scene_projectId_orderIndex_idx" ON "Scene"("projectId", "orderIndex");
CREATE INDEX "Generation_sceneId_createdAt_idx" ON "Generation"("sceneId", "createdAt");
CREATE INDEX "Generation_status_idx" ON "Generation"("status");
CREATE UNIQUE INDEX "QualityReport_generationId_key" ON "QualityReport"("generationId");
CREATE INDEX "AudioTrack_projectId_idx" ON "AudioTrack"("projectId");
CREATE INDEX "RenderJob_projectId_createdAt_idx" ON "RenderJob"("projectId", "createdAt");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditWallet" ADD CONSTRAINT "CreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioTrack" ADD CONSTRAINT "AudioTrack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
