FROM supermalang/xaymash-app as production


FROM production as development
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        && curl https://get.symfony.com/cli/installer -O | bash