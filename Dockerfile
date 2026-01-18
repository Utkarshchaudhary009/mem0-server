# Bun image highly recommended for performance
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["bun", "run", "src/index.ts"]
