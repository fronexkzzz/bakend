# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# init empty data file if not present
RUN [ ! -f /app/data.json ] && echo "{\"users\":[],\"otp_codes\":[],\"products\":[],\"news\":[],\"orders\":[]}" > /app/data.json || true

ENV PORT=3001
CMD ["node", "dist/index.js"]
