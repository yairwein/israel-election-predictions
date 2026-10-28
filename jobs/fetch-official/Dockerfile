# Reads the Central Elections Committee's results with a real browser and stores them for the leaderboard.
FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /job
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY fetch-official.mjs ./
USER pwuser
CMD ["node", "fetch-official.mjs"]
