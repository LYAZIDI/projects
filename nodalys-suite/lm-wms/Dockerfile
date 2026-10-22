# LM-WMS - image pour hébergement cloud (Render, Railway, Fly.io...)
FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .
# Base de démonstration réaliste générée à la construction
RUN node lib/seed-realiste.js

ENV PORT=8747
EXPOSE 8747
CMD ["node", "server.js"]
