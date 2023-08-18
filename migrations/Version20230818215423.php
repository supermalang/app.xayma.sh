<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230818215423 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE credit_transaction (id INT AUTO_INCREMENT NOT NULL, created_by_id INT NOT NULL, modified_by_id INT DEFAULT NULL, credits_purchased INT NOT NULL, amount_paid INT NOT NULL, created DATETIME NOT NULL, modified DATETIME DEFAULT NULL, INDEX IDX_5E1DE3E1B03A8386 (created_by_id), INDEX IDX_5E1DE3E199049ECE (modified_by_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE credit_transaction ADD CONSTRAINT FK_5E1DE3E1B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE credit_transaction ADD CONSTRAINT FK_5E1DE3E199049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE organization ADD allow_credit_debt TINYINT(1) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE credit_transaction DROP FOREIGN KEY FK_5E1DE3E1B03A8386');
        $this->addSql('ALTER TABLE credit_transaction DROP FOREIGN KEY FK_5E1DE3E199049ECE');
        $this->addSql('DROP TABLE credit_transaction');
        $this->addSql('ALTER TABLE organization DROP allow_credit_debt');
    }
}
