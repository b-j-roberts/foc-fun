FROM node:21.7.1-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apk add --no-cache bash git jq curl

WORKDIR /app
COPY ./frontend/package.json ./frontend/pnpm-lock.yaml ./
RUN pnpm install
COPY ./frontend ./

SHELL ["/bin/bash", "-c"]
# Clear the entrypoint
ENTRYPOINT []
CMD ["npm", "run", "dev"]
