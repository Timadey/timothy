FROM node:22-bookworm-slim AS ssr-build
WORKDIR /var/www/html
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

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
        libstdc++6 \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring opcache zip \
    && pecl install redis && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && rm -rf /root/.composer/cache

# Fresh frontend + SSR bundles built by the node stage (source of truth at
# image build time; committed public/build remains for local dev convenience).
COPY --from=ssr-build /var/www/html/public/build public/build
COPY --from=ssr-build /var/www/html/bootstrap/ssr bootstrap/ssr
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node

COPY conf/php-fpm/zz-timadey.conf /usr/local/etc/php-fpm.d/zz-timadey.conf
COPY conf/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini

RUN rm -f /etc/nginx/sites-enabled/default \
    && cp conf/nginx/nginx-site.conf /etc/nginx/sites-available/timadey.conf \
    && ln -s /etc/nginx/sites-available/timadey.conf /etc/nginx/sites-enabled/timadey.conf \
    && chmod +x scripts/00-laravel-deploy.sh scripts/start.sh

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
ENV CACHE_STORE=redis
ENV SESSION_DRIVER=redis
ENV INERTIA_SSR_ENABLED=true

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1/up || exit 1

CMD ["/var/www/html/scripts/start.sh"]
