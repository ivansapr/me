FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY package.json package-lock.json* ./
RUN apk add --no-cache curl \
    && npm ci --omit=dev \
    && npm cache clean --force
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
CMD ["node", "build"]
