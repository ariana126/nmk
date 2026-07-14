FROM node:22-bookworm-slim

# The Serenity BDD reporter renders its living documentation via a Java binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["tail", "-f", "/dev/null"]
