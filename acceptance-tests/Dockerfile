FROM node:24-bookworm-slim

# The Serenity BDD reporter renders its living documentation via a Java binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# The install's own browser download would fetch every browser Playwright pins; skip it and let
# the next step fetch just the one, together with the system libraries Chromium needs.
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

# Where the browser comes from. Empty means Playwright's own CDN, which is correct everywhere it is
# reachable — including CI. It is geo-blocked in some regions, though, answering 403 "this service
# is not available in your location". Set PLAYWRIGHT_DOWNLOAD_HOST in .env to a mirror there; only
# the host changes, the URL path is identical. Same arrangement as frontend/Dockerfile.a11y.
ARG PLAYWRIGHT_DOWNLOAD_HOST=
RUN npx playwright install --with-deps chromium

COPY . .

CMD ["tail", "-f", "/dev/null"]
