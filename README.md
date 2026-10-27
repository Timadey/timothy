# Timadey

A personal platform: writing archive, notes, projects, a collected library, about/now pages, full-text search, and a session-secure admin for managing it all — built with **Laravel + Inertia + React (TypeScript)** and **PostgreSQL**.

## Phase overview

| Phase | Scope | Status |
|-------|-------|--------|
| **1 — Functional Foundation** | Shell, design system, Home, Writing, Notes, Projects, Collected, About, Now, Search, public REST API, SEO/RSS/sitemap, admin auth + content management, demo seed content | **This repo** |
| 2 | Activity feed, questions, comments, visitor auth, moderation | Planned |
| 3 | Ask Timadey (AI guide over published content) | Planned (`/ask` is a labelled placeholder) |
| 4 | Live layer + integrations | Planned |
| 5 | Subscriptions, polish, production deployment (Docker scaffold lives in `docker/`) | Planned |

Deferred from Phase 1 by design: comments, visitor accounts, AI features, and integration tables (spec §18).

## Requirements

- PHP ≥ 8.2 (8.4 recommended) with `pdo_pgsql`
- Composer
- Node 22 (20+ should work)
- PostgreSQL (e.g. via [DBngin](https://dbngin.com/))

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
# create a PostgreSQL database named 'timadey', then:
php artisan migrate:fresh --seed
npm install
npm run build   # or: npm run dev
php artisan serve
```

Then open http://localhost:8000.

Built assets (`public/build`, `bootstrap/ssr`) are generated, never committed — Docker builds them inside the image, and locally they come from `npm run build` (or `npm run dev` for hot reload).

## Admin

- Visit `/admin/login`.
- Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (seeded by `OwnerSeeder`).
- Manage posts (articles + notes), projects, collected items, now/about sections, social links, tags/topics, and site settings.

## Demo content

`migrate:fresh --seed` creates clearly-labelled **Demo:** articles, notes, projects, collected items, default now/about sections, and settings so every page has something to show. Nothing here is real biography.

To remove it: **Admin → Settings → Remove demo content** (deletes every row with `is_demo = true`; your own content is untouched).

## Public API

Read-only JSON endpoints for published content: `GET /api/posts`, `/api/notes`, `/api/projects`, `/api/collected`, `/api/search`. See [`docs/api.md`](docs/api.md). No auth required; drafts and private items always 404.

## Testing

```bash
./vendor/bin/pest      # backend feature suite
npm test               # frontend unit tests
npm run build          # production asset build
npx tsc --noEmit       # type check
npm run test:e2e       # builds assets, then runs Playwright
```

## Environment variables

| Variable | Purpose | Default (`.env.example`) |
|----------|---------|--------------------------|
| `APP_NAME` | Application name | `Timadey` |
| `APP_URL` | Base URL | `http://localhost:8000` |
| `APP_DEBUG` | Debug pages | `true` (false in production) |
| `DB_CONNECTION` | Database driver | `pgsql` |
| `DB_HOST` / `DB_PORT` | Postgres host/port | `127.0.0.1` / `5432` |
| `DB_DATABASE` | Database name | `timadey` |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials | `postgres` / (empty) |
| `ADMIN_EMAIL` | Owner login email | `owner@timadey.test` |
| `ADMIN_PASSWORD` | Owner login password | `change-me-in-production` |
| `SESSION_SECURE_COOKIE` | Secure cookies | `false` (set `true` in production) |
| `CACHE_STORE` | Cache driver | `database` locally, `redis` in Docker |
| `SESSION_DRIVER` | Session driver | `database` locally, `redis` in Docker |
| `REDIS_HOST` | Redis host (required in production) | `127.0.0.1` (set to Coolify Redis service name) |
| `REDIS_PASSWORD` | Redis password | `null` |
| `REDIS_URL` | Optional single-var Redis config (`redis://:pass@host:6379`) — overrides `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB`; omit the URL path so `REDIS_CACHE_DB` still applies | `null` |
| `INERTIA_SSR_ENABLED` | Server-side rendering | `false` locally, `true` in Docker |

Phase 3 vars are present but commented out: `# LLM_PROVIDER=`, `# LLM_API_KEY=`, `# LLM_MODEL=`.

## Docker

Production deploys with the root `Dockerfile` — a single container (nginx + PHP 8.4.27-FPM, today's security patch) built on Coolify and bootstrapped by `scripts/00-laravel-deploy.sh`. See [`docs/superpowers/specs/2026-10-21-docker-deployment-design.md`](docs/superpowers/specs/2026-10-21-docker-deployment-design.md).

## License

Private / all rights reserved unless stated otherwise.
