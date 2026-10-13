# Phase 5 target scaffold — multi-stage build (assets → PHP-FPM runtime).
# See docker/README.md.

FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM php:8.4-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libpq-dev $PHPIZE_DEPS \
    && docker-php-ext-install pdo_pgsql \
    && apt-get purge -y --auto-remove $PHPIZE_DEPS \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --no-interaction --optimize-autoloader --no-scripts
COPY --from=assets /app/public/build ./public/build
RUN php artisan package:discover --ansi || true

EXPOSE 9000
CMD ["php-fpm"]
