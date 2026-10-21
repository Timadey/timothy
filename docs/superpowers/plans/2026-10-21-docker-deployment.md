# Docker Deployment (Coolify, docs_and_decks pattern) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship timadey's production deployment files — a single-container Docker setup (nginx + PHP-FPM on port 80) rebuilt on official `php:8.4.27-fpm` (today's security patch), following the user's `docs_and_decks` reference pattern, replacing the stale Phase-5 scaffold, verified by a real `docker build` + container smoke test.

**Architecture:** Root `Dockerfile` pins `php:8.4.27-fpm-bookworm` with a build-time version assertion, installs nginx + supervisor, bakes committed `public/build` assets and `composer install --no-dev`, and boots via `scripts/start.sh` → `scripts/00-laravel-deploy.sh` (config caches, migrations, storage, permissions) → supervisord running php-fpm (unix socket) + nginx. Deployment target is Coolify: one web service on port 80 behind Coolify's TLS proxy, connecting to an existing Postgres DB via env vars, with a persistent disk on `storage/`.

**Tech Stack:** Docker (Debian bookworm base), nginx, php-fpm 8.4.27, supervisord, Composer 2, Laravel 12, Pest, Coolify.

**Spec:** `docs/superpowers/specs/2026-10-21-docker-deployment-design.md` (committed `586dc63` + amendment `88e2e76`).

## Global Constraints

- **PHP is pinned to exactly `8.4.27`** — one of today's (2026-10-21) security releases (8.5.12 / **8.4.27** / 8.3.36 / 8.2.35 for CVE-2026-109618 + CVE-2026-109619, CVSS 9.2). User confirmed 8.4.27. The Dockerfile build must FAIL on any other PHP version.
- **Pattern parity with `docs_and_decks`:** root `Dockerfile`, `conf/nginx/nginx-site.conf` copied **verbatim** from `/Users/macbook/Herd/docs_and_decks/conf/nginx/nginx-site.conf` (plus a gzip block only), boot hook named `scripts/00-laravel-deploy.sh`, single container serving **port 80**, SSL terminated by the Coolify proxy.
- **Assets:** built frontend files are **committed to git** (`.gitignore` line `/public/build` becomes `!/public/build`); no Node stage in the image.
- **Composer runs at build** (`--no-dev --optimize-autoloader`); boot scripts never run composer.
- **DB:** existing Postgres on Coolify, via `DB_*` env (`pdo_pgsql` build dep).
- **Deployment-only changes.** Never modify or stage the user's in-flight files: `routes/web.php`, `.env.example`, `resources/js/**` (Ask, Collected, Writing, MobileNav, ComposeBody, SentView, Hero, AdminLayout…), `app/Http/Controllers/AskController.php`, `app/Mail/**`, `config/ask.php`, `resources/views/mail/**`, `tests/Feature/AskTest.php`, `app/Http/Middleware/HandleInertiaRequests.php`, or anything under `bootstrap/cache`, `.env`, `vendor/`, `public/build` other than adding it.
- **TDD:** `tests/Feature/DeploymentAssetsTest.php` is written and committed RED first; every task runs the relevant tests before its commit.
- **Full Pest suite: 0 failures** after every task (exact total may drift with the user's concurrent test edits — currently 233 pre-existing; expect ~240 after the 7 new tests).
- Commit style: repo convention `type: lowercase summary` (e.g. `feat:`, `chore:`, `test:`, `docs:`).
- Docker Desktop was NOT running at plan-writing time — Task 8 starts it.

## File structure

| File | Responsibility | Task |
|---|---|---|
| `tests/Feature/DeploymentAssetsTest.php` | TDD guard: 7 assertions across deployment files | 1 |
| `docker/Dockerfile`, `docker/nginx.conf`, `docker/README.md`, `docker-compose.yml` | Stale Phase-5 scaffold — **deleted** | 2 |
| `README.md:83` (§Docker) | Re-point at root Dockerfile + spec | 2 |
| `.gitignore` | `/public/build` → `!/public/build` | 3 |
| `public/build/**` | Committed Vite output (`manifest.json` = 26 071 B already built) | 3 |
| `.dockerignore` | Lean, secret-free build context | 4 |
| `Dockerfile` | Build: PHP 8.4.27 pin assertion, nginx+supervisor+fpm extensions, composer, conf install, healthcheck | 5 |
| `conf/nginx/nginx-site.conf` | Reference server block verbatim + gzip | 6 |
| `conf/php-fpm/zz-timadey.conf` | unix-socket listen + stderr access log + `clear_env = no` | 6 |
| `conf/supervisor/supervisord.conf` | php-fpm + nginx under supervisord (replaces richarvey's `/start.sh`) | 6 |
| `scripts/00-laravel-deploy.sh` | Boot hook: APP_KEY guard, `artisan optimize`, migrate (5×10 s retry), `storage:link`, permissions | 7 |
| `scripts/start.sh` | Entrypoint: run `scripts/[0-9]*.sh`, then `exec supervisord` | 7 |

---

### Task 1: RED — deployment assertions (Pest)

**Files:**
- Create: `tests/Feature/DeploymentAssetsTest.php`

**Interfaces:**
- Produces: 7 test names used by later tasks' verification commands:
  `ships a Dockerfile pinned to today's patched PHP`, `ships the reference nginx config with php-fpm socket and gzip`, `guards APP_KEY, optimizes and migrates at boot`, `starts php-fpm and nginx under supervisord`, `commits built frontend assets`, `keeps dev cruft out of the image build context`, `has replaced the stale Phase-5 docker scaffold`.

- [ ] **Step 1: Write the failing test file**

```php
<?php

it("ships a Dockerfile pinned to today's patched PHP", function () {
    $path = base_path('Dockerfile');
    expect(file_exists($path))->toBeTrue();

    $dockerfile = file_get_contents($path);

    expect($dockerfile)->toContain('FROM php:8.4.27-fpm-bookworm')
        ->and($dockerfile)->toContain('PHP_VERSION === "8.4.27"');
});

it('ships the reference nginx config with php-fpm socket and gzip', function () {
    $path = base_path('conf/nginx/nginx-site.conf');
    expect(file_exists($path))->toBeTrue();

    $conf = file_get_contents($path);

    expect($conf)->toContain('listen 80')
        ->and($conf)->toContain('root /var/www/html/public;')
        ->and($conf)->toContain('fastcgi_pass unix:/var/run/php-fpm.sock')
        ->and($conf)->toContain('gzip on');
});

it('guards APP_KEY, optimizes and migrates at boot', function () {
    $path = base_path('scripts/00-laravel-deploy.sh');
    expect(file_exists($path))->toBeTrue();

    $deploy = file_get_contents($path);

    expect($deploy)->toContain('APP_KEY')
        ->and($deploy)->toContain('php artisan optimize')
        ->and($deploy)->toContain('php artisan migrate --force')
        ->and($deploy)->toContain('storage:link')
        ->and($deploy)->not->toContain('composer update');
});

it('starts php-fpm and nginx under supervisord', function () {
    $startPath = base_path('scripts/start.sh');
    $confPath = base_path('conf/supervisor/supervisord.conf');
    expect(file_exists($startPath))->toBeTrue()
        ->and(file_exists($confPath))->toBeTrue();

    $start = file_get_contents($startPath);
    $supervisord = file_get_contents($confPath);

    expect($start)->toContain('supervisord -c /var/www/html/conf/supervisor/supervisord.conf')
        ->and($supervisord)->toContain('[program:php-fpm]')
        ->and($supervisord)->toContain('[program:nginx]');
});

it('commits built frontend assets', function () {
    $manifest = public_path('build/manifest.json');
    expect(file_exists($manifest))->toBeTrue()
        ->and(filesize($manifest))->toBeGreaterThan(0);

    $gitignore = file_get_contents(base_path('.gitignore'));
    expect($gitignore)->toContain('!/public/build');
});

it('keeps dev cruft out of the image build context', function () {
    $path = base_path('.dockerignore');
    expect(file_exists($path))->toBeTrue();

    $lines = array_map('trim', file($path));

    expect($lines)->toContain('.git')
        ->and($lines)->toContain('node_modules');
});

it('has replaced the stale Phase-5 docker scaffold', function () {
    expect(file_exists(base_path('docker-compose.yml')))->toBeFalse()
        ->and(file_exists(base_path('docker')))->toBeFalse();
});
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php`
Expected: `7 failed` — each failing on its first `file_exists`/`toBeFalse` assertion with a clear message (e.g. `Expected true to be false` for the scaffold test; `Failed asserting that false` for `Dockerfile` missing). No PHP warnings (later `file_get_contents` calls are only reached after the existence assertion passes).

- [ ] **Step 3: Commit the red test**

```bash
git add tests/Feature/DeploymentAssetsTest.php
git commit -m "test: red deployment asset assertions (tdd)"
```
Expected: `[phase-1 <hash>] test: red deployment asset assertions (tdd)`, 1 file changed.

---

### Task 2: Replace the stale Phase-5 scaffold

**Files:**
- Delete: `docker/Dockerfile`, `docker/nginx.conf`, `docker/README.md`, `docker-compose.yml` (via `git rm -r`)
- Modify: `README.md` (§Docker, currently line 83)

**Interfaces:**
- Consumes: the scaffold-replacement test from Task 1.
- Produces: green test `has replaced the stale Phase-5 docker scaffold`; README no longer references `docker/`.

- [ ] **Step 1: Delete the scaffold**

Run:
```bash
git rm -r docker-compose.yml docker
```
Expected: 4 files staged for deletion (`docker-compose.yml`, `docker/Dockerfile`, `docker/README.md`, `docker/nginx.conf`), message `rm 'docker-compose.yml'` etc.

- [ ] **Step 2: Update the README Docker section**

In `README.md`, replace the single line:

```
`docker/` + `docker-compose.yml` is a **Phase 5 target scaffold** (app + postgres:16 + nginx) — not required for local development. See [`docker/README.md`](docker/README.md).
```

with:

```
Production deploys with the root `Dockerfile` — a single container (nginx + PHP 8.4.27-FPM, today's security patch) built on Coolify and bootstrapped by `scripts/00-laravel-deploy.sh`. See [`docs/superpowers/specs/2026-10-21-docker-deployment-design.md`](docs/superpowers/specs/2026-10-21-docker-deployment-design.md).
```

(The `## Docker` heading above it stays.)

- [ ] **Step 3: Run the scaffold test to verify it passes**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php --filter="stale Phase-5"`
Expected: `1 passed`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "chore: replace phase-5 docker scaffold with coolify deployment target"
```
Expected: 1 file changed (README) — the deletions are already staged from Step 1; total in commit = 5 files (4 deletions + README).

---

### Task 3: Commit built frontend assets

**Files:**
- Modify: `.gitignore` (line `/public/build`)
- Add: `public/build/**` (currently ignored; `manifest.json` is 26 071 bytes, already built today)

**Interfaces:**
- Consumes: manifest test from Task 1.
- Produces: green test `commits built frontend assets`; Dockerfile (Task 5) will `COPY` these into the image.

- [ ] **Step 1: Flip the gitignore line**

In `.gitignore`, replace the line

```
/public/build
```

(the one between `/node_modules` and `/public/hot`) with

```
!/public/build
```

- [ ] **Step 2: Verify git now sees the assets**

Run: `git check-ignore -v public/build/manifest.json; echo "exit=$?"`
Expected: no pattern output and `exit=1` (previously it printed `.gitignore:16:/public/build`).

Run: `git status --short public/build | head -3`
Expected: lines starting `?? public/build/...` (untracked, now visible).

- [ ] **Step 3: Run the asset test to verify it passes**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php --filter="commits built frontend assets"`
Expected: `1 passed`.

- [ ] **Step 4: Stage assets and commit**

```bash
git add .gitignore public/build
git status --short public/build | wc -l
git commit -m "chore: commit built frontend assets (!/public/build)"
```
Expected: file count > 0 (manifest + hashed files under `public/build/assets/`); commit `1 file changed` for `.gitignore` + all added assets (git may report the count of files changed, all `create mode`).

---

### Task 4: `.dockerignore`

**Files:**
- Create: `.dockerignore`

**Interfaces:**
- Consumes: dockerignore test from Task 1.
- Produces: green test `keeps dev cruft out of the image build context`; smaller, secret-free build context for Task 5.

- [ ] **Step 1: Write the file**

```
.git
.github
.idea
.vscode
.fleet
.nova
.zed
node_modules
public/hot
public/storage
.env
.env.*
auth.json
tests
e2e
qa
docs
test-results
playwright-report
.superpowers
storage/logs/*.log
storage/pail
*.log
.DS_Store
Thumbs.db
playwright.config.ts
vite.config.ts
vitest.config.ts
phpunit.xml
phpunit.xml.dist
```

Notes (for the implementer): `public/build` must **not** appear here — committed assets must ship in the image. `.env*` keeps secrets out; `tests`/`docs`/`e2e` are never needed at runtime; `conf/` and `scripts/` must stay in the context (they are deployment files).

- [ ] **Step 2: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php --filter="keeps dev cruft"`
Expected: `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore for lean build context"
```

---

### Task 5: Dockerfile (PHP 8.4.27 pin)

**Files:**
- Create: `Dockerfile`

**Interfaces:**
- Consumes: `.dockerignore` (Task 4), `conf/` + `scripts/` (Tasks 6–7, present by build time), `public/build` (Task 3).
- Produces: image `timadey:deploy` built in Task 8; test `ships a Dockerfile pinned to today's patched PHP` goes green.

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
FROM php:8.4.27-fpm-bookworm

# Today's security patch (2026-10-21: CVE-2026-109618 / CVE-2026-109619).
# Fail the build loudly on any other PHP version.
RUN php -r 'if (PHP_VERSION === "8.4.27") exit(0); fwrite(STDERR, "unpatched PHP: " . PHP_VERSION . "\n"); exit(1);'

RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        unzip \
        libpq-dev \
        libonig-dev \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring opcache zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && rm -rf /root/.composer/cache

COPY conf/php-fpm/zz-timadey.conf /usr/local/etc/php-fpm.d/zz-timadey.conf

RUN rm -f /etc/nginx/sites-enabled/default \
    && cp conf/nginx/nginx-site.conf /etc/nginx/sites-available/timadey.conf \
    && ln -s /etc/nginx/sites-available/timadey.conf /etc/nginx/sites-enabled/timadey.conf \
    && chmod +x scripts/00-laravel-deploy.sh scripts/start.sh

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1/up || exit 1

CMD ["/var/www/html/scripts/start.sh"]
```

Notes: `composer install` runs `post-autoload-dump` → `package:discover` only (safe bare, no `.env` needed; the `setup` script — which runs migrate + npm — is NOT auto-invoked). `conf/` and `scripts/` arrive via `COPY . .` and are not dockerignored. The `COPY conf/php-fpm/...` line is explicit because `COPY . .` places it under the app root.

- [ ] **Step 2: Run the test to verify it passes**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php --filter="pinned to today"`
Expected: `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add dockerfile pinned to php 8.4.27 (today's security patch)"
```

---

### Task 6: nginx, php-fpm and supervisord configs

**Files:**
- Create: `conf/nginx/nginx-site.conf`
- Create: `conf/php-fpm/zz-timadey.conf`
- Create: `conf/supervisor/supervisord.conf`

**Interfaces:**
- Consumes: nothing (pure config).
- Produces: green test `ships the reference nginx config with php-fpm socket and gzip`; socket path contract `/var/run/php-fpm.sock` shared by nginx + php-fpm + the spec; `conf/supervisor/supervisord.conf` path consumed by `scripts/start.sh` (Task 7).

- [ ] **Step 1: Copy the reference nginx config**

Copy **verbatim** from the user's reference:

```nginx
server {
  # Render provisions and terminates SSL
  listen 80;

  # Make site accessible from http://localhost/
  server_name _;

  root /var/www/html/public;
  index index.html index.htm index.php;

  # Disable sendfile as per https://docs.vagrantup.com/v2/synced-folders/virtualbox.html
  sendfile off;

  # Add stdout logging
  error_log /dev/stdout info;
  access_log /dev/stdout;

  # block access to sensitive information about git
  location /.git {
    deny all;
    return 403;
  }

  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-XSS-Protection "1; mode=block";
  add_header X-Content-Type-Options "nosniff";

  charset utf-8;

  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_min_length 256;
  gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

  location / {
      try_files $uri $uri/ /index.php?$query_string;
  }

  location = /favicon.ico { access_log off; log_not_found off; }
  location = /robots.txt  { access_log off; log_not_found off; }

  error_page 404 /index.php;

  location ~* \.(jpg|jpeg|gif|png|css|js|ico|webp|tiff|ttf|svg)$ {
    expires 5d;
  }

  location ~ \.php$ {
    fastcgi_split_path_info ^(.+\.php)(/.+)$;
    fastcgi_pass unix:/var/run/php-fpm.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_param SCRIPT_NAME $fastcgi_script_name;
    include fastcgi_params;
  }

  # deny access to . files
  location ~ /\. {
    log_not_found off;
    deny all;
  }

  location ~ /\.(?!well-known).* {
    deny all;
  }
}
```

(The only difference from `/Users/macbook/Herd/docs_and_decks/conf/nginx/nginx-site.conf` is the gzip block — everything else is byte-for-byte the reference.)

- [ ] **Step 2: Write the php-fpm socket override**

`conf/php-fpm/zz-timadey.conf` (loaded after the image's `www.conf`, so it wins):

```ini
[www]
listen = /var/run/php-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
access.log = /proc/self/fd/2
clear_env = no
```

`clear_env = no` is explicit (not relying on the image default) so every Coolify env var (`APP_KEY`, `DB_*`, `MAIL_*`) reaches the PHP app.

- [ ] **Step 3: Write the supervisord config**

`conf/supervisor/supervisord.conf`:

```ini
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=/usr/local/sbin/php-fpm --nodaemonize
autostart=true
autorestart=true
priority=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
priority=20
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

- [ ] **Step 4: Run the nginx test to verify it passes**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php --filter="reference nginx config"`
Expected: `1 passed`.

(Overall suite state now: **5 passed, 2 failed** — the boot-script and supervisord tests still need Task 7.)

- [ ] **Step 5: Commit**

```bash
git add conf/
git commit -m "feat: add nginx, php-fpm socket and supervisord configs"
```

---

### Task 7: Boot scripts (deploy hook + entrypoint)

**Files:**
- Create: `scripts/00-laravel-deploy.sh`
- Create: `scripts/start.sh`

**Interfaces:**
- Consumes: `conf/supervisor/supervisord.conf` (Task 6) — exact path `/var/www/html/conf/supervisor/supervisord.conf`.
- Produces: green tests `guards APP_KEY, optimizes and migrates at boot` + `starts php-fpm and nginx under supervisord`; runtime contract from the spec: APP_KEY hard-fail, `php artisan optimize`, `migrate --force` with 5×10 s retry, `storage:link || true`, `chown/chmod storage bootstrap/cache`.

- [ ] **Step 1: Write the deploy hook**

`scripts/00-laravel-deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Checking APP_KEY..."
if [ -z "${APP_KEY:-}" ]; then
    echo "ERROR: APP_KEY is not set. Generate one with: php artisan key:generate --show" >&2
    exit 1
fi

echo "Caching config, routes and views..."
php artisan optimize

echo "Running migrations (retrying while the database warms up)..."
retries=0
until php artisan migrate --force; do
    retries=$((retries + 1))
    if [ "$retries" -ge 5 ]; then
        echo "ERROR: migrations failed after $retries attempts" >&2
        exit 1
    fi
    echo "Database not ready, retrying in 10s ($retries/5)..."
    sleep 10
done

echo "Creating storage symlink..."
php artisan storage:link || true

echo "Fixing permissions..."
chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

echo "Deployment scripts complete."
```

No composer here (build-time only — spec §2), no Filament/icons steps (not installed), `php artisan optimize` verified safe locally (route:cache exits 0 despite closure routes — spec amendment `88e2e76`).

- [ ] **Step 2: Write the entrypoint**

`scripts/start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Running container boot scripts..."
for script in /var/www/html/scripts/[0-9]*.sh; do
    [ -e "$script" ] || continue
    echo "==> ${script}"
    bash "${script}"
done

echo "Starting supervisord (php-fpm + nginx)..."
exec /usr/bin/supervisord -c /var/www/html/conf/supervisor/supervisord.conf
```

(The glob deliberately mirrors richarvey's RUN_SCRIPTS convention; `start.sh` itself is excluded because it does not start with a digit. `bash` invocation means no executable bit is required in git — the Dockerfile also `chmod +x`s both scripts.)

- [ ] **Step 3: Run the deployment test file — all 7 must pass**

Run: `vendor/bin/pest tests/Feature/DeploymentAssetsTest.php`
Expected: `7 passed, 0 failed`.

- [ ] **Step 4: Run the full suite — must stay green**

Run: `vendor/bin/pest`
Expected: all tests pass (233 pre-existing + 7 new ≈ **240 passed**; exact total may differ if the user's concurrent test edits landed — requirement: **0 failed**, no warnings/errors).

- [ ] **Step 5: Commit**

```bash
git add scripts/00-laravel-deploy.sh scripts/start.sh
git commit -m "feat: add container boot scripts (00-laravel-deploy hook + start.sh)"
```

---

### Task 8: Build, smoke test, regression (verification gate — no commit)

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: evidence the deployment works: patched PHP in the image, boot script runs, nginx+fpm serve the app, `/up` 200, homepage 200 with brand favicon, image contains no `.env`.

- [ ] **Step 1: Start Docker Desktop (daemon was down)**

Run:
```bash
open -a Docker
for i in $(seq 1 45); do docker info >/dev/null 2>&1 && break; sleep 2; done
docker info --format '{{.ServerVersion}}'
```
Expected: a Docker server version number (e.g. `28.x.x`). If still failing after ~90 s, stop and report — do not continue.

- [ ] **Step 2: Build the image (version pin executes here)**

Run: `docker build -t timadey:deploy .`
Expected: `DONE` build with **no** `unpatched PHP:` error — the very first layer proves `PHP_VERSION === "8.4.27"`. Any other PHP version fails the build by design.

- [ ] **Step 3: Verify the runtime offline**

```bash
docker run --rm timadey:deploy php -v
```
Expected: first line `PHP 8.4.27 (cli) ...`.

```bash
docker run --rm timadey:deploy nginx -t
```
Expected: `syntax is ok` and `test is successful`.

```bash
docker run --rm timadey:deploy sh -c 'ls -la .env 2>&1'
```
Expected: `No such file or directory` (secrets never baked — `.dockerignore`).

- [ ] **Step 4: Stand up an isolated smoke stack (Postgres container + app container)**

Run:
```bash
docker network create timadey-smoke-net

docker run -d --name timadey-smoke-db --network timadey-smoke-net \
  -e POSTGRES_DB=timadey -e POSTGRES_USER=timadey -e POSTGRES_PASSWORD=timadey \
  postgres:16-alpine

until docker exec timadey-smoke-db pg_isready -U timadey >/dev/null 2>&1; do sleep 1; done
echo "db ready"

APP_KEY=$(php artisan key:generate --show)
echo "key generated: ${APP_KEY:0:12}..."

docker run -d --name timadey-smoke --network timadey-smoke-net -p 8080:80 \
  -e APP_KEY="$APP_KEY" \
  -e APP_ENV=production -e APP_DEBUG=false -e APP_URL=http://localhost:8080 \
  -e DB_CONNECTION=pgsql -e DB_HOST=timadey-smoke-db -e DB_PORT=5432 \
  -e DB_DATABASE=timadey -e DB_USERNAME=timadey -e DB_PASSWORD=timadey \
  -e SESSION_DRIVER=database -e CACHE_STORE=database -e QUEUE_CONNECTION=database \
  -e ADMIN_EMAIL=smoke@timadey.test -e ADMIN_PASSWORD=smoke-owner-pass-123 \
  timadey:deploy
```
Expected: `db ready` within a few seconds (image `postgres:16-alpine` may download ~90 MB on first use); `docker ps` shows both containers `Up` (healthy after the 30 s start period). Port 8080 was verified free (`lsof -nP -i :8080` empty) at plan time; if occupied, use 8081 in both `-p` and `APP_URL`/curl.

**Why `ADMIN_EMAIL`/`ADMIN_PASSWORD` are required here:** `DemoContentSeeder` falls back to `User::factory()->create()` when no owner exists (`DemoContentSeeder:13`), and Faker is a dev dependency the `--no-dev` image does not ship — the seed would crash. With both env vars set, `OwnerSeeder` creates the owner first and the factory branch is never reached. (Same env pair is needed in production for the first `db:seed` — see spec §4.)

- [ ] **Step 5: Assert the HTTP surface**

```bash
for i in $(seq 1 30); do curl -fsS http://localhost:8080/up >/dev/null 2>&1 && break; sleep 2; done

curl -fsS -o /dev/null -w 'up=%{http_code}\n' http://localhost:8080/up
docker exec timadey-smoke php artisan db:seed --force
curl -fsS -o /dev/null -w 'home=%{http_code}\n' http://localhost:8080/
curl -fsS http://localhost:8080/ | grep -q favicon && echo "favicon OK"
docker logs timadey-smoke 2>&1 | grep -q "Deployment scripts complete." && echo "boot scripts OK"
```
Expected (in order): `up=200`; seeder output (`Database\Seeders\DatabaseSeeder` completed — `OwnerSeeder` creates the owner from `ADMIN_*`, `DemoContentSeeder` inserts demo content, its `User::factory()` fallback never reached); `home=200`; `favicon OK`; `boot scripts OK`.

If `/up` never returns 200 within 60 s: `docker logs timadey-smoke` (boot script or supervisord error will name the cause — fix, rebuild from Step 2; do not weaken assertions).

- [ ] **Step 6: Tear down the smoke stack**

```bash
docker rm -f timadey-smoke timadey-smoke-db
docker network rm timadey-smoke-net
```
Expected: both names printed, network removed. (Local dev DBs are untouched — the smoke stack is fully containerized.)

- [ ] **Step 7: Final regression**

Run: `vendor/bin/pest`
Expected: **0 failed** (≈240 passed). Playwright/e2e not required — no application or frontend code changed in this plan (deployment files only).

---

## Self-review notes (plan author)

- Spec coverage: §1 goals/constraints → Global Constraints; §2 decisions → Tasks 5–7 details + header; §3 file table → File structure table + Tasks 2–7; §4 Coolify wiring → Task 8 Step 4 env + Task 8 notes; §5 test plan (6 tests + smoke) → Tasks 1–8 (7th test = scaffold replacement, added by spec amendment); §6 risks → constraint "never stage in-flight files" + Task 8 teardown isolation + pin assertion.
- Placeholder scan: all steps contain exact file contents, exact commands, expected outputs; no "TBD"/"similar to Task N".
- Type/name consistency: supervisord conf path identical in Dockerfile CMD, `start.sh`, and test assertion (`/var/www/html/conf/supervisor/supervisord.conf`); socket path identical in nginx conf, php-fpm override, and test (`/var/run/php-fpm.sock`); `PHP_VERSION === "8.4.27"` string identical in Dockerfile and test assertion.
