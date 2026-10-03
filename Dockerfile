FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV KNOWLEDGE_BASE_INDEX_PATH=/app/knowledge-base/index.json
COPY --from=build /app/dist ./dist
COPY knowledge-base/index.json ./knowledge-base/index.json
EXPOSE 8787
CMD ["node", "dist/src/server.js"]
