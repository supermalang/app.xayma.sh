FROM supermalang/xaymash-app as production


FROM production as development
RUN apt-get update && apt-get install -y --no-install-recommends git
# Install Symfony CLI
RUN curl https://get.symfony.com/cli/installer -O && bash installer
RUN mv /root/.symfony5/bin/symfony /usr/local/bin/symfony \
    && chmod -R 777 /var/www/app.xayma.sh/var \
    && php /var/www/app.xayma.sh/bin/console cache:clear

COPY ./entrypoint-dev.sh /var/www/entrypoint.sh
