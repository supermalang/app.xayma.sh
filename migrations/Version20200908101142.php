<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20200908101142 extends AbstractMigration
{
    public function getDescription() : string
    {
        return '';
    }

    public function up(Schema $schema) : void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE control_node ADD created_by_id INT NOT NULL, ADD modified_by_id INT DEFAULT NULL, ADD created DATETIME NOT NULL, ADD modified DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE control_node ADD CONSTRAINT FK_7791B6F0B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE control_node ADD CONSTRAINT FK_7791B6F099049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_7791B6F0B03A8386 ON control_node (created_by_id)');
        $this->addSql('CREATE INDEX IDX_7791B6F099049ECE ON control_node (modified_by_id)');
    }

    public function down(Schema $schema) : void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE control_node DROP FOREIGN KEY FK_7791B6F0B03A8386');
        $this->addSql('ALTER TABLE control_node DROP FOREIGN KEY FK_7791B6F099049ECE');
        $this->addSql('DROP INDEX IDX_7791B6F0B03A8386 ON control_node');
        $this->addSql('DROP INDEX IDX_7791B6F099049ECE ON control_node');
        $this->addSql('ALTER TABLE control_node DROP created_by_id, DROP modified_by_id, DROP created, DROP modified');
    }
}
