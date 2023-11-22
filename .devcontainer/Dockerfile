FROM mcr.microsoft.com/devcontainers/php:1-8.2-bullseye

# Custom config
RUN apt-get update && apt-get install -y --no-install-recommends \
        zlib1g-dev \
        libzip-dev \
        libxml2-dev \
        libicu-dev \
        nginx \
        unzip \
        npm \
        graphviz \
    && pecl install apcu \
    && docker-php-ext-enable apcu opcache \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure zip \
    && docker-php-ext-install zip mysqli pdo pdo_mysql intl opcache

# Install MariaDB client
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y mariadb-client \ 
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment this line to install global node packages.
# RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && npm install -g <your-package-here>" 2>&1

