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
