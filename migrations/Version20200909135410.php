<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20200909135410 extends AbstractMigration
{
    public function getDescription() : string
    {
        return '';
    }

    public function up(Schema $schema) : void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE organization ADD created_by_id INT NOT NULL, ADD modified_by_id INT DEFAULT NULL, ADD created DATETIME NOT NULL, ADD modified DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE organization ADD CONSTRAINT FK_C1EE637CB03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE organization ADD CONSTRAINT FK_C1EE637C99049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_C1EE637CB03A8386 ON organization (created_by_id)');
        $this->addSql('CREATE INDEX IDX_C1EE637C99049ECE ON organization (modified_by_id)');
    }

    public function down(Schema $schema) : void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE organization DROP FOREIGN KEY FK_C1EE637CB03A8386');
        $this->addSql('ALTER TABLE organization DROP FOREIGN KEY FK_C1EE637C99049ECE');
        $this->addSql('DROP INDEX IDX_C1EE637CB03A8386 ON organization');
        $this->addSql('DROP INDEX IDX_C1EE637C99049ECE ON organization');
        $this->addSql('ALTER TABLE organization DROP created_by_id, DROP modified_by_id, DROP created, DROP modified');
    }
}
