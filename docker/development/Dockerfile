FROM supermalang/xaymash-app as production

FROM production as development
RUN apt-get update && apt-get install -y --no-install-recommends git graphviz
# Install Symfony CLI
RUN curl https://get.symfony.com/cli/installer -O && bash installer
RUN mv /root/.symfony5/bin/symfony /usr/local/bin/symfony \
    && chown -R www-data:www-data /var/www/app.xayma.sh \
    && chmod -R 777 /var/www/app.xayma.sh/var \
    && php /var/www/app.xayma.sh/bin/console cache:clear

COPY ./entrypoint-dev.sh /var/www/entrypoint.sh
