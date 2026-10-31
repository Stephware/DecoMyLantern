FROM node:22-bookworm-slim
WORKDIR /app/story-renderer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 \
    libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY story-renderer/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY story-renderer/remotionEntry.tsx story-renderer/generateAssets.mjs story-renderer/composition.mjs ./
COPY src/frontend/src/ /app/src/frontend/src/
RUN npx remotion browser ensure
RUN npm run assets
COPY story-renderer/ ./
EXPOSE 7070
CMD ["node","server.mjs"]
