FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json turbo.json ./
COPY packages ./packages
COPY services/media-worker ./services/media-worker

RUN npm install --workspace @cineora/contracts --workspace @cineora/media-worker
RUN npm --workspace @cineora/contracts run build
RUN npm --workspace @cineora/media-worker run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install real FFmpeg & FFprobe for video QC and quality-preserving rendering
RUN apk add --no-cache ffmpeg

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /app/services/media-worker/dist ./services/media-worker/dist
COPY --from=builder --chown=node:node /app/services/media-worker/package.json ./services/media-worker/package.json

USER node
CMD ["node", "services/media-worker/dist/index.js"]
