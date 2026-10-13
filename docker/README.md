# Docker scaffold (Phase 5)

Minimal, valid scaffold for running Timadey in containers: **php:8.4-fpm** app (with a Node 22 asset-build stage), **PostgreSQL 16**, and **nginx**.

> **Not required for local development.** Day-to-day work uses `composer install`, `npm run dev`/`build`, and `php artisan serve` (see the root README). This scaffold is the starting point for production deployment work in Phase 5 and has not been hardened yet (no TLS, no queue workers, no backups).

## Run

```bash
# needs APP_KEY in your shell/.env (php artisan key:generate)
docker compose up --build -d

# first boot only: create the schema and seed demo content
docker compose exec app php artisan migrate:fresh --seed
```

Then open http://localhost:8080.

## Notes

- Static assets are served by nginx from the shared `public` volume (built in the image's Node stage).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read from your `.env` (defaults are set in `docker-compose.yml`).
- Data lives in named volumes: `dbdata` (Postgres), `public`, `storage`.
- Tear down with `docker compose down` (add `-v` to also drop volumes).
