FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
ENV NODE_ENV=production
ENV BACKEND_URL=http://backend:8000
EXPOSE 3000
CMD ["bun", "src/index.ts"]
