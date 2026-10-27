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

it('ensures the storage directory structure exists before artisan runs', function () {
    $deploy = file_get_contents(base_path('scripts/00-laravel-deploy.sh'));

    expect($deploy)->toContain('mkdir -p')
        ->and($deploy)->toContain('storage/framework/views');
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
        ->and($lines)->toContain('node_modules')
        ->and($lines)->not->toContain('public/build');
});

it('has replaced the stale Phase-5 docker scaffold', function () {
    expect(file_exists(base_path('docker-compose.yml')))->toBeFalse()
        ->and(file_exists(base_path('docker')))->toBeFalse();
});

it('ships a production-tuned opcache ini', function () {
    $path = base_path('conf/php/opcache.ini');
    expect(file_exists($path))->toBeTrue();

    $ini = file_get_contents($path);

    expect($ini)->toContain('opcache.enable=1')
        ->and($ini)->toContain('opcache.enable_cli=1')
        ->and($ini)->toContain('opcache.memory_consumption=256')
        ->and($ini)->toContain('opcache.interned_strings_buffer=32')
        ->and($ini)->toContain('opcache.max_accelerated_files=32531')
        ->and($ini)->toContain('opcache.validate_timestamps=0')
        ->and($ini)->toContain('opcache.save_comments=1');
});

it('installs the opcache ini and the redis extension in the image', function () {
    $dockerfile = file_get_contents(base_path('Dockerfile'));

    expect($dockerfile)->toContain('COPY conf/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini')
        ->and($dockerfile)->toContain('pecl install redis')
        ->and($dockerfile)->toContain('docker-php-ext-enable redis')
        ->and($dockerfile)->toContain('libstdc++6');
});

it('defaults production to redis cache/sessions and enables SSR', function () {
    $dockerfile = file_get_contents(base_path('Dockerfile'));

    expect($dockerfile)->toContain('ENV CACHE_STORE=redis')
        ->and($dockerfile)->toContain('ENV SESSION_DRIVER=redis')
        ->and($dockerfile)->toContain('ENV INERTIA_SSR_ENABLED=true');
});

it('tunes the php-fpm pool', function () {
    $conf = file_get_contents(base_path('conf/php-fpm/zz-timadey.conf'));

    expect($conf)->toContain('pm = dynamic')
        ->and($conf)->toContain('pm.max_children = 16')
        ->and($conf)->toContain('pm.start_servers = 4')
        ->and($conf)->toContain('pm.min_spare_servers = 2')
        ->and($conf)->toContain('pm.max_spare_servers = 6')
        ->and($conf)->toContain('pm.max_requests = 500');
});
