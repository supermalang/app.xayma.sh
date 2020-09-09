<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20200909141043 extends AbstractMigration
{
    public function getDescription() : string
    {
        return '';
    }

    public function up(Schema $schema) : void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE deployments CHANGE created created DATETIME NOT NULL, CHANGE createdby created_by_id INT NOT NULL, CHANGE owner modified_by_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D5B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D599049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_373C43D5B03A8386 ON deployments (created_by_id)');
        $this->addSql('CREATE INDEX IDX_373C43D599049ECE ON deployments (modified_by_id)');
    }

    public function down(Schema $schema) : void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D5B03A8386');
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D599049ECE');
        $this->addSql('DROP INDEX IDX_373C43D5B03A8386 ON deployments');
        $this->addSql('DROP INDEX IDX_373C43D599049ECE ON deployments');
        $this->addSql('ALTER TABLE deployments CHANGE created created DATETIME DEFAULT NULL, CHANGE created_by_id createdby INT NOT NULL, CHANGE modified_by_id owner INT DEFAULT NULL');
    }
}
