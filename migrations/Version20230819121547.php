<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230819121547 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE settings (id INT AUTO_INCREMENT NOT NULL, created_by_id INT NOT NULL, modified_by_id INT DEFAULT NULL, max_days_to_archive_depl INT NOT NULL, max_days_to_delete_depl INT NOT NULL, max_days_to_archive_orgs INT NOT NULL, max_days_to_delete_orgs INT NOT NULL, low_credit_threshold INT NOT NULL, max_credits_debt INT NOT NULL, credit_price DOUBLE PRECISION DEFAULT NULL, created DATETIME NOT NULL, modified DATETIME DEFAULT NULL, INDEX IDX_E545A0C5B03A8386 (created_by_id), INDEX IDX_E545A0C599049ECE (modified_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE settings ADD CONSTRAINT FK_E545A0C5B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE settings ADD CONSTRAINT FK_E545A0C599049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE settings DROP FOREIGN KEY FK_E545A0C5B03A8386');
        $this->addSql('ALTER TABLE settings DROP FOREIGN KEY FK_E545A0C599049ECE');
        $this->addSql('DROP TABLE settings');
    }
}
