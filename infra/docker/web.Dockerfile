FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install --workspace @cineora/contracts --workspace @cineora/web
RUN npm --workspace @cineora/contracts run build
RUN npm --workspace @cineora/web run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/contracts ./packages/contracts
COPY --from=builder --chown=node:node /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=node:node /app/apps/web/package.json ./apps/web/package.json

USER node
EXPOSE 3000
CMD ["npm", "--workspace", "@cineora/web", "run", "start"]
