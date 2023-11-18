FROM supermalang/xaymash-app as production


FROM production as development
RUN apt-get update && apt-get install -y --no-install-recommends git
# Install Symfony CLI
RUN curl https://get.symfony.com/cli/installer -O && bash installer
RUN mv /root/.symfony* /usr/local/bin/symfony

COPY ./entrypoint-dev.sh /var/www/entrypoint.sh
