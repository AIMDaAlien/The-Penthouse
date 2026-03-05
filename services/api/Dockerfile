FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json services/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm --workspace packages/contracts run build
RUN npm --workspace services/api run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api/dist ./services/api/dist
COPY --from=build /app/services/api/src/db/migrations ./services/api/src/db/migrations
COPY --from=build /app/services/api/.env.example ./services/api/.env.example
EXPOSE 3000
CMD ["node", "services/api/dist/index.js"]
