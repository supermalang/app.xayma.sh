<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20200906144159 extends AbstractMigration
{
    public function getDescription() : string
    {
        return '';
    }

    public function up(Schema $schema) : void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE service ADD controle_node_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD2569AC4A6 FOREIGN KEY (controle_node_id) REFERENCES control_node (id)');
        $this->addSql('CREATE INDEX IDX_E19D9AD2569AC4A6 ON service (controle_node_id)');
    }

    public function down(Schema $schema) : void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE service DROP FOREIGN KEY FK_E19D9AD2569AC4A6');
        $this->addSql('DROP INDEX IDX_E19D9AD2569AC4A6 ON service');
        $this->addSql('ALTER TABLE service DROP controle_node_id');
    }
}
