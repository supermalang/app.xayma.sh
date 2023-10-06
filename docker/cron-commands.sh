#!/bin/bash
cd /var/www/app.xayma.sh/ && php bin/console app:check-credit-status && php bin/console app:update-remaining-credits