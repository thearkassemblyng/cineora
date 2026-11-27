FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm install --workspace @cineora/contracts --workspace @cineora/api
RUN npm --workspace @cineora/contracts run build
RUN npm --workspace @cineora/api run prisma:generate
RUN npm --workspace @cineora/api run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json

USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
