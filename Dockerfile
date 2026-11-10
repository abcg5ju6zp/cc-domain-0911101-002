FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps --no-shell chromium
COPY . .
CMD ["npm", "run", "test:browser"]
