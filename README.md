# mini-microservices-node-react

A mini microservices application with Node.js backends, a React frontend, an Nginx gateway, and a polyglot Python/FastAPI notification worker.

### Demo

[![screencast](./demo/demo.gif)](./demo/demo.gif)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API and Gateway Routes](#api-and-gateway-routes)
- [Environment Variables](#environment-variables)
- [Build and Push Images](#build-and-push-images)
- [Public vs Local Files](#public-vs-local-files)
- [Frontend Cloud Provider Deploy Workflow](#frontend-cloud-provider-deploy-workflow)
- [Container Publish Workflows](#container-publish-workflows)
- [License](#license)
- [Author](#author)

## Prerequisites

- Docker Engine
- Docker Compose plugin
- A Docker Hub account if you want to publish your own images
- Twilio account and credentials if you test SMS delivery


## Installation

```bash
git clone https://github.com/firassBenNacib/mini-microservices-node-react.git
cd mini-microservices-node-react
cp .env.example .env
```

Update `.env` with real values before running the application.

For local work, prefer:

```bash
cp .env.local.example .env
```

`.env.local.example` is intended to boot the local application with safe demo values. Keep real cloud credentials out of it.

For a cloud deployment, use [`.env.cloud-provider.example`](./.env.cloud-provider.example) as the reference contract and inject real values through your deployment system rather than committing a real `.env`.

## Usage

### Compose Files and Roles

- `docker-compose.yml`: base application definition with pinned immutable image digests (reproducible default, requires `DOCKERHUB_USERNAME` in `.env`).
- `docker-compose.images.yml`: switches app services to tag-based published images (requires `DOCKERHUB_USERNAME`; uses `IMAGE_TAG` from `.env`).
- `docker-compose.build.yml`: enables local builds from source with local image tags (`IMAGE_TAG` from `.env`) and does not require a Docker Hub username.
- `docker-compose.dev.yml`: dev-only host port exposure for Postgres and Mailpit (bound to localhost only).

### Common Run Patterns

1. Run pinned immutable images:

```bash
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
```

2. Run published demo-tag images:

```bash
docker compose -f docker-compose.yml -f docker-compose.images.yml pull
docker compose -f docker-compose.yml -f docker-compose.images.yml up -d
docker compose -f docker-compose.yml -f docker-compose.images.yml ps
```

3. Build from local source:

```bash
DOCKERHUB_USERNAME=local docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
DOCKERHUB_USERNAME=local docker compose -f docker-compose.yml -f docker-compose.build.yml ps
```

4. Add dev overlay (DB/Mailpit host ports) to either images or build mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.images.yml -f docker-compose.dev.yml up -d
DOCKERHUB_USERNAME=local docker compose -f docker-compose.yml -f docker-compose.build.yml -f docker-compose.dev.yml up -d --build
```

Stop services:

```bash
docker compose -f docker-compose.yml down --remove-orphans
```

Remove services and volumes:

```bash
docker compose -f docker-compose.yml down --remove-orphans --volumes
```

Troubleshooting:

- If you see `required variable DOCKERHUB_USERNAME is missing a value: DOCKERHUB_USERNAME is required`, add `DOCKERHUB_USERNAME` to `.env` and rerun pinned/images modes.

## API and Gateway Routes

Public entrypoint: `http://localhost:7080`

- `/auth/*` -> `auth-service`
- `/api/*` -> `api-service`
- `/audit/*` -> `audit-service`
- `/notify/health` -> `notification-service` health
- `/notify/twilio/status` -> Twilio delivery callback endpoint
- `/` -> `web-frontend`

## Environment Variables

Use separate environment files by runtime:

- [`.env.local.example`](./.env.local.example): local Docker Compose development
- [`.env.cloud-provider.example`](./.env.cloud-provider.example): cloud deployment runtime reference
- [`.env.example`](./.env.example): backward-compatible generic example

Minimum required values in `.env`:

- `JWT_SECRET`
- `DEFAULT_USER_PASSWORD`
- `DB_USER`
- `DB_PASSWORD`
- `MAILER_API_KEY`
- `NOTIFY_API_KEY`
- `AUDIT_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `DOCKERHUB_USERNAME`

Optional:

- `IMAGE_TAG`
- `TWILIO_STATUS_CALLBACK_URL`

## Build and Push Images

Use immutable tags (for example `1.0.0` or a git SHA), not `latest`.
When updating base images or rebuilding published artifacts, update digest pins in `docker-compose.yml` intentionally.

```bash
docker login
DOCKERHUB_USERNAME=your-dockerhub-username
IMAGE_TAG=1.0.0

DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-auth:${IMAGE_TAG} ./backend/auth-service
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-api:${IMAGE_TAG} ./backend/api-service
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-mailer:${IMAGE_TAG} ./backend/mailer-service
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-audit:${IMAGE_TAG} ./backend/audit-service
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-notification:${IMAGE_TAG} ./backend/notification-service
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-web:${IMAGE_TAG} ./frontend
DOCKER_BUILDKIT=1 docker build -t ${DOCKERHUB_USERNAME}/mini-node-gateway:${IMAGE_TAG} ./gateway

docker push ${DOCKERHUB_USERNAME}/mini-node-auth:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-api:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-mailer:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-audit:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-notification:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-web:${IMAGE_TAG}
docker push ${DOCKERHUB_USERNAME}/mini-node-gateway:${IMAGE_TAG}
```

## Public vs Local Files

Safe to push to a public repository:

- application source code
- Dockerfiles and Compose files
- `Makefile`
- `scripts/`
- `.github/workflows/`
- example environment contracts:
  - `.env.example`
  - `.env.local.example`
  - `.env.cloud-provider.example`
- repo metadata such as `CODEOWNERS`, `CONTRIBUTING.md`, and `SECURITY.md`

Keep local and do not commit:

- `.env`
- any real secret values
- built frontend artifacts
- `node_modules/`, coverage, and other local tool output
- any scratch output in `.artifacts/`

## Frontend Cloud Provider Deploy Workflow

The repo includes [frontend-s3-deploy.yml](./.github/workflows/frontend-s3-deploy.yml) for React/Vite build + object storage sync + optional CDN invalidation.

Run it manually from GitHub Actions and provide these inputs:

- `cloud_provider_region`
- `frontend_bucket`
- optional `frontend_distribution_id`
- `cloud_provider_role_to_assume`

The current implementation uses GitHub OIDC via `aws-actions/configure-aws-credentials`, so long-lived access keys are not required.

## Container Publish Workflows

The repo includes manual image publish workflows:

- [dockerhub-publish.yml](./.github/workflows/dockerhub-publish.yml)
- [ecr-publish.yml](./.github/workflows/ecr-publish.yml)

Use them when you want to build and publish the full service set without relying on a local shell environment.

## License

This project is licensed under the [MIT License](./LICENSE).

## Author

Created and maintained by Firas Ben Nacib - [bennacibfiras@gmail.com](mailto:bennacibfiras@gmail.com)
