<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230819122242 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('INSERT INTO `settings` (`created_by_id`, `created`, `max_days_to_archive_depl`, `max_days_to_delete_depl`, `max_days_to_archive_orgs`, `max_days_to_delete_orgs`, `low_credit_threshold`, `max_credits_debt`, `credit_price`) VALUES (1, NOW(), 0, 0, 0, 0, 0, 0, 0.0)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DELETE FROM `settings` WHERE `created_by_id` = 1');
    }
}
