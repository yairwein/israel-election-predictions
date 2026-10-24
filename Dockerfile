FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /app/build build/
COPY --from=build /app/node_modules node_modules/
COPY --from=build /app/package.json .
COPY --from=build /app/assets assets/

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
# Cloud Run terminates TLS; trust its forwarding headers.
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV ADDRESS_HEADER=x-forwarded-for
ENV XFF_DEPTH=1

EXPOSE 8080
USER node
CMD ["node", "build"]
