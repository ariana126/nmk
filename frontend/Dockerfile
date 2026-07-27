FROM node:24-bookworm-slim

WORKDIR /app

# @playwright/test downloads a browser bundle on install. This image only ever serves and
# builds the app — the accessibility audit runs in the Dockerfile.a11y image, which ships
# its browsers preinstalled — so skip a ~150 MB download that could never launch here
# anyway, for want of the system libraries Chromium needs.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0"]
