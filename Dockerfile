FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY src ./src
COPY .env.example ./
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "src/index.js"]

