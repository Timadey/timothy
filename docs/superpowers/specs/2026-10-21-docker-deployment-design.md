# Docker deployment (Coolify) — design

**Date:** 2026-10-21
**Status:** Approved (approach A — same architecture as docs_and_decks, rebuilt on official patched PHP)

## 1. Goals & scope

- Get timadey deployable on **Coolify** using the same deployment pattern as the user's `docs_and_decks` project: root `Dockerfile`, `conf/nginx/nginx-site.conf`, boot-time `scripts/00-laravel-deploy.sh` hook, single container (nginx + php-fpm) serving port 80, SSL terminated by Coolify's proxy (the reference nginx conf's comment — "Render provisions and terminates SSL" — describes exactly this arrangement).
- **PHP must be the version patched in today's security release (2026-10-21)**: PHP shipped 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35 fixing CVE-2026-109618 + CVE-2026-109619 (two unauthenticated RCEs, CVSS 9.2, public PoCs circulating). Chosen: **PHP 8.4.27** (matches local dev's 8.4 line, supported by `php: ^8.2` + Laravel 12).
- The reference base image `richarvey/nginx-php-fpm:3.1.6` was **last pushed 2023-06-10** (abandoned, unpatched, EOL Alpine repos) — using it verbatim is impossible under the security requirement; we keep its architecture/behavior but rebuild it on official `php:8.4.27-fpm-bookworm`.
- Out of scope: queue worker and scheduler (the app has no queued jobs and only the stock `inspire` command), MySQL support, S3 media storage, CI workflow changes, README/docs updates (exception: the one-line README §Docker pointer required by the scaffold replacement below), Coolify UI setup and SMTP credential entry (user's tasks).

## 2. Decisions

- **Base image:** `php:8.4.27-fpm-bookworm` with a build-time assertion — the build **fails** unless `PHP_VERSION === "8.4.27"`, making the patch verifiable (`docker run --rm <img> php -v` must print 8.4.27).
- **Base-image conflict resolved** (user approved approach A): richarvey literal copy rejected (unpatchable/abandoned); adopting a third-party all-in-one image rejected (no guarantee of exactly-8.4.27 today, diverges from reference conventions).
- **DB:** an existing database on Coolify is connected via `DB_*` env vars. Driver assumed **Postgres** (`pdo_pgsql`) — matches timadey's local setup and every test; if the existing Coolify DB is MySQL, the build deps swap (`pdo_mysql`) — flagged here as the one assumption.
- **Frontend assets:** same as reference — flip `.gitignore` to `!/public/build` and commit built assets; no Node in the image.
- **Composer at build, not boot:** `composer install --no-dev --optimize-autoloader` during `docker build` (reproducible from `composer.lock`). The reference runs `composer update` at container start — non-reproducible and slow; consciously deviated (user-approved in approach presentation). Boot keeps the reference's runtime duties only.
- **APP_KEY must come from env** (Coolify UI); boot script hard-fails if missing (reference's `key:generate --show` only prints — useless for boot).
- **Mail:** Ask feature sends mail in-process (no queue) — `MAIL_*` envs are set in Coolify UI; boot does not touch mail.
- **Storage persistence:** persistent volume mounted over `storage/` in Coolify (hero avatars, post covers, uploads live under `storage/app/public/`); image bakes the directory structure so first-run volume init is valid; boot runs `storage:link` + permission fixes.
- **nginx conf = reference verbatim + gzip only** (no other drift), still on `fastcgi_pass unix:/var/run/php-fpm.sock` — so php-fpm is overridden to that socket (official image defaults to TCP 9000).
- **Full `php artisan optimize` at boot is safe:** verified locally — `php artisan route:cache` exits 0 ("Routes cached successfully") despite the closure routes in `routes/web.php` (Laravel 12 serializes them), then `event:cache` + `config:cache` also exit 0. No boot-script deviation needed from the spec's `php artisan optimize`.
- **Stale Phase-5 scaffold replaced** (user decision): the repo ships `docker/Dockerfile` + `docker/nginx.conf` + `docker/README.md` + `docker-compose.yml` (committed `0380505`, labeled "Phase 5 target scaffold" for a traditional VPS target: split `php:8.4-fpm` + separate `nginx:alpine` + own `postgres:16`, floating `php:8.4-fpm` tag, Node asset stage). It contradicts this design on every axis (own DB vs existing Coolify DB; Node build vs committed assets; no PHP pin; split services vs single container) and would leave a misleading, unpatched deployment path in the repo. **Delete all four files** and update README.md's §Docker line to point at the root `Dockerfile` + this spec. Verified: nothing else references them (no CI, no scripts — only README.md:83).

## 3. Files

| File | Action | Contents / responsibility |
|---|---|---|
| `Dockerfile` | create | `FROM php:8.4.27-fpm-bookworm`; version-pin assertion; apt install `nginx supervisor curl unzip libpq-dev libonig-dev libzip-dev`; `docker-php-ext-install pdo_pgsql mbstring opcache zip`; composer binary copied from `composer:2`; `COPY . .`; `composer install --no-dev -o`; install confs; `EXPOSE 80`; `HEALTHCHECK ... curl -fsS http://127.0.0.1/up`; `ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr COMPOSER_ALLOW_SUPERUSER=1`; `CMD ["scripts/start.sh"]` |
| `conf/nginx/nginx-site.conf` | create | Reference file verbatim (listen 80, `server_name _`, root `/var/www/html/public`, stdout logs, `/.git` deny + 403, security headers `X-Frame-Options/X-XSS-Protection/X-Content-Type-Options`, charset utf-8, `try_files ... /index.php?$query_string`, favicon/robots access_log off, static assets `expires 5d`, php → `fastcgi_pass unix:/var/run/php-fpm.sock` with `SCRIPT_FILENAME`, dotfiles denied incl. `/\.(?!well-known)`) **plus** a gzip block (text/html/css/js/json/svg/xml/atom/rss, `complevel 6`, `vary Accept-Encoding`) |
| `conf/supervisor/supervisord.conf` | create | `nodaemon=true`; programs `php-fpm` (`/usr/local/sbin/php-fpm --nodaemonize`) and `nginx` (`nginx -g "daemon off;"`), `autorestart=true`, stdout/stderr → `/dev/stdout`,`/dev/stderr` |
| `conf/php-fpm/zz-timadey.conf` | create | `[www]` overrides: `listen = /var/run/php-fpm.sock`, `listen.mode = 0660`, `access.log = /proc/self/fd/2`, clear_env default; official image already sets error_log to stderr |
| `scripts/00-laravel-deploy.sh` | create | `set -euo pipefail`; APP_KEY guard (exit 1 if empty); wait-for-DB: retry `php artisan migrate --force` up to 5 attempts with 10s sleep between failures (hard-fail after); `php artisan optimize` before migrate; `php artisan migrate --force`; `php artisan storage:link || true`; `chown -R www-data:www-data storage bootstrap/cache && chmod -R 775 storage bootstrap/cache`; echo progress like the reference script |
| `scripts/start.sh` | create | executable; runs `scripts/00-laravel-deploy.sh`; `exec /usr/bin/supervisord -c /var/www/html/conf/supervisor/supervisord.conf` |
| `.dockerignore` | create | `.git`, `.github`, `.idea`/`.vscode`/`.fleet`/`.nova`/`.zed`, `node_modules`, `.env`/`.env.*`, `tests`, `e2e`, `qa`, `docs`, `storage/logs/*.log`, `*.log`, `.DS_Store`, `playwright.config.ts`, `vitest` configs, `phpunit.xml` (tests are excluded, config unused in image), `Thumbs.db` |
| `.gitignore` | modify | After `/public/build`, add `!/public/build` (reference pattern) |
| `public/build/**` | commit | Fresh `npm run build` output (assets already built today) |
| `tests/Feature/DeploymentAssetsTest.php` | create | TDD guard (below) |
| `docker/Dockerfile`, `docker/nginx.conf`, `docker/README.md`, `docker-compose.yml` | **delete** | Stale Phase-5 scaffold — superseded (see §2) |
| `README.md` (§Docker line 83) | modify | Replace the `docker/` scaffold pointer with: root `Dockerfile` (nginx + PHP 8.4.27 single container) deploys on Coolify — see this spec |

## 4. Runtime wiring (Coolify)

- Service: Dockerfile build, port **80**, health check path `/up` (Laravel route already exists — Playwright's webServer uses it).
- Env vars: `APP_KEY`, `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false`, `DB_CONNECTION/DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD` (existing Coolify DB), `MAIL_*` (Ask feature), `SESSION_DRIVER=database`, `LOG_CHANNEL=stderr`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` (owner account).
- **First boot in production:** the boot script migrates but does **not** seed (by design — demo content is a choice). Run `php artisan db:seed --force` once via Coolify's shell with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set — otherwise no owner account exists and admin login is impossible. Note: `DemoContentSeeder` falls back to `User::factory()` when no owner exists, and Faker is a dev dependency absent from the `--no-dev` image, so the `ADMIN_*` env pair is **required** for seeding (verified during smoke testing).
- Persistent disk mounted at `/var/www/html/storage`.
- Proxy terminates SSL; container speaks plain HTTP — matches reference `listen 80` + comment.

## 5. Test plan (TDD — RED first)

**Pest** — `tests/Feature/DeploymentAssetsTest.php`:
1. `Dockerfile` exists and contains `FROM php:8.4.27-fpm-bookworm` and the version-pin assertion (`PHP_VERSION === "8.4.27"`).
2. `conf/nginx/nginx-site.conf` exists, contains `listen 80`, `fastcgi_pass unix:/var/run/php-fpm.sock`, and `gzip on`.
3. `scripts/00-laravel-deploy.sh` exists and contains `migrate --force` + `APP_KEY` guard; `scripts/start.sh` starts supervisord.
4. `.gitignore` contains `!/public/build`; `public/build/manifest.json` exists and is non-empty.
5. `.dockerignore` exists and excludes `.git` and `node_modules`.
6. `docker-compose.yml` and `docker/` no longer exist (stale scaffold replaced).

All RED before the files are created, GREEN after implementation.

**Build/smoke verification (manual commands in plan, expected outputs stated):**
- `docker build -t timadey:deploy .` succeeds (version assertion passes) → `docker run --rm timadey:deploy php -v` prints `8.4.27`.
- Smoke run against local Postgres via host gateway (`--add-host=host.docker.internal:host-gateway`): fresh `APP_KEY` from `php artisan key:generate --show` (does not modify `.env`), a **throwaway database** `timadey_docker_smoke` (created via PDO from `.env` creds so local dev data is never touched; migrations exercise the full schema; `db:seed` supplies home-page content; dropped afterwards) → `curl http://localhost:8080/up` → 200; `curl http://localhost:8080/` → 200 with the brand favicon `<link>` tags present in HTML; `docker logs` shows the boot script + php-fpm + nginx under supervisord.

**Regression:** full Pest suite stays green (no application code changes).

## 6. Risks / notes

- **Assumption:** the existing Coolify DB is Postgres. If MySQL, swap build deps (`pdo_mysql`) and `DB_*` — one-line-ish change, called out here.
- `storage:link || true` because it errors when the link exists (redeploys).
- Boot script retries migrations for DB readiness (Coolify may start the app before the DB accepts connections; the reference script has no retry — a deliberate resilience addition).
- Concurrent unrelated work in the repo (ask email composer, collected/writing edits) must not be staged with deployment commits.
- Today's PHP patch is a security emergency with circulating PoCs — internet-facing deploys before 8.4.27 are explicitly discouraged (the pin exists to prevent this).
