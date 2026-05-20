FROM node:22-alpine AS builder

RUN apk add --no-cache python3 py3-pip make g++ linux-headers
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json

RUN npm ci --workspace @penthouse/api --workspace @penthouse/contracts --include-workspace-root

COPY packages/contracts packages/contracts
COPY services/api services/api

RUN npm --workspace @penthouse/api run build
RUN npm prune --omit=dev --workspace @penthouse/api --workspace @penthouse/contracts --include-workspace-root

FROM node:22-alpine AS runtime

RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/services/api/dist ./services/api/dist

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npm --workspace @penthouse/api run migrate:prod && if [ -n \"${ALPHA_BOOTSTRAP_INVITE_CODE:-}\" ]; then npm --workspace @penthouse/api run bootstrap:alpha:prod; fi && npm --workspace @penthouse/api run start"]
