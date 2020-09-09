<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20200909142815 extends AbstractMigration
{
    public function getDescription() : string
    {
        return '';
    }

    public function up(Schema $schema) : void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE deployments ADD service_id INT NOT NULL');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D5ED5CA9E6 FOREIGN KEY (service_id) REFERENCES service (id)');
        $this->addSql('CREATE INDEX IDX_373C43D5ED5CA9E6 ON deployments (service_id)');
    }

    public function down(Schema $schema) : void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D5ED5CA9E6');
        $this->addSql('DROP INDEX IDX_373C43D5ED5CA9E6 ON deployments');
        $this->addSql('ALTER TABLE deployments DROP service_id');
    }
}
