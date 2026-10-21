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
