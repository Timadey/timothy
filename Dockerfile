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
