FROM php:8.1.4-fpm-buster

ENV PHP_OPCACHE_VALIDATE_TIMESTAMPS="0" \
    PHP_OPCACHE_MAX_ACCELERATED_FILES="10000" \
    PHP_OPCACHE_MEMORY_CONSUMPTION="192" \
    PHP_OPCACHE_MAX_WASTED_PERCENTAGE="10"

RUN apt-get update && apt-get install -y --no-install-recommends \
        zlib1g-dev \
        libzip-dev \
        libxml2-dev \
        libicu-dev \
        nginx \
        unzip \
        npm \
    && pecl install apcu \
    && docker-php-ext-enable apcu opcache \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure zip \
    && docker-php-ext-install zip mysqli pdo pdo_mysql intl opcache \
    && docker-php-source delete \
    && rm -rf /tmp/pear \
    && rm -rf /var/cache/apk/*

RUN mv ${PHP_INI_DIR}/php.ini-production ${PHP_INI_DIR}/php.ini \
    && sed -E -i -e 's/upload_max_filesize = 2M/upload_max_filesize = 128M/' ${PHP_INI_DIR}/php.ini \
    && sed -E -i -e 's/post_max_size = 8M/post_max_size = 128M/' ${PHP_INI_DIR}/php.ini \
    && sed -E -i -e 's/memory_limit = 128M/memory_limit = 256M/' ${PHP_INI_DIR}/php.ini \
    && echo "apc.enable_cli = 1" >> ${PHP_INI_DIR}/php.ini

COPY ./docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

COPY ./docker/nginx-block.conf /etc/nginx/sites-available/default 

COPY ./docker/entrypoint.sh /var/www/entrypoint.sh

COPY . /var/www/app.xayma.sh/

WORKDIR /var/www

RUN curl -sS https://getcomposer.org/installer -o composer-setup.php \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && cd app.xayma.sh \
    && /usr/local/bin/composer install \
    && npm install \
    && npm run build --if-present \
    && chmod +x /var/www/entrypoint.sh \
    && chown -R www-data:www-data /var/www/app.xayma.sh \
    && php /var/www/app.xayma.sh/bin/console cache:clear \
    && chmod -R 777 /var/www/app.xayma.sh/var

CMD /bin/bash /var/www/entrypoint.sh

EXPOSE 80