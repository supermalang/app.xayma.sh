<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20230815143155 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL, available_at DATETIME NOT NULL, delivered_at DATETIME DEFAULT NULL, INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE addons_folder CHANGE label label VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE control_node CHANGE label label VARCHAR(50) NOT NULL, CHANGE address address VARCHAR(255) NOT NULL, CHANGE authorization_token authorization_token VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE control_node ADD CONSTRAINT FK_7791B6F0B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE control_node ADD CONSTRAINT FK_7791B6F099049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE deployments CHANGE label label VARCHAR(255) NOT NULL, CHANGE domain_name domain_name VARCHAR(50) DEFAULT NULL, CHANGE status status VARCHAR(20) NOT NULL, CHANGE slug slug VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D532C8A3DE FOREIGN KEY (organization_id) REFERENCES organization (id)');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D5B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D599049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE deployments ADD CONSTRAINT FK_373C43D5ED5CA9E6 FOREIGN KEY (service_id) REFERENCES service (id)');
        $this->addSql('ALTER TABLE organization ADD remaining_credits INT NOT NULL, CHANGE label label VARCHAR(100) NOT NULL, CHANGE status status VARCHAR(20) NOT NULL, CHANGE slug slug VARCHAR(100) NOT NULL');
        $this->addSql('ALTER TABLE organization ADD CONSTRAINT FK_C1EE637CB03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE organization ADD CONSTRAINT FK_C1EE637C99049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE organization_user ADD CONSTRAINT FK_B49AE8D432C8A3DE FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE organization_user ADD CONSTRAINT FK_B49AE8D4A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE service CHANGE label label VARCHAR(50) NOT NULL, CHANGE description description LONGTEXT DEFAULT NULL, CHANGE deploy_tags deploy_tags VARCHAR(40) NOT NULL, CHANGE stop_tags stop_tags VARCHAR(40) NOT NULL, CHANGE start_tags start_tags VARCHAR(40) NOT NULL, CHANGE suspend_tags suspend_tags VARCHAR(40) NOT NULL');
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD2569AC4A6 FOREIGN KEY (controle_node_id) REFERENCES control_node (id)');
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD2B03A8386 FOREIGN KEY (created_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE service ADD CONSTRAINT FK_E19D9AD299049ECE FOREIGN KEY (modified_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE user CHANGE email email VARCHAR(180) NOT NULL, CHANGE password password VARCHAR(255) NOT NULL, CHANGE first_name first_name VARCHAR(50) NOT NULL, CHANGE last_name last_name VARCHAR(30) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE messenger_messages');
        $this->addSql('ALTER TABLE addons_folder CHANGE label label VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE user CHANGE email email VARCHAR(180) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE password password VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE first_name first_name VARCHAR(50) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE last_name last_name VARCHAR(30) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE control_node DROP FOREIGN KEY FK_7791B6F0B03A8386');
        $this->addSql('ALTER TABLE control_node DROP FOREIGN KEY FK_7791B6F099049ECE');
        $this->addSql('ALTER TABLE control_node CHANGE label label VARCHAR(50) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE address address VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE authorization_token authorization_token VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE service DROP FOREIGN KEY FK_E19D9AD2569AC4A6');
        $this->addSql('ALTER TABLE service DROP FOREIGN KEY FK_E19D9AD2B03A8386');
        $this->addSql('ALTER TABLE service DROP FOREIGN KEY FK_E19D9AD299049ECE');
        $this->addSql('ALTER TABLE service CHANGE label label VARCHAR(50) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE description description LONGTEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE deploy_tags deploy_tags VARCHAR(40) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE stop_tags stop_tags VARCHAR(40) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE start_tags start_tags VARCHAR(40) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE suspend_tags suspend_tags VARCHAR(40) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE organization DROP FOREIGN KEY FK_C1EE637CB03A8386');
        $this->addSql('ALTER TABLE organization DROP FOREIGN KEY FK_C1EE637C99049ECE');
        $this->addSql('ALTER TABLE organization DROP remaining_credits, CHANGE label label VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE status status VARCHAR(20) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE slug slug VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D532C8A3DE');
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D5B03A8386');
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D599049ECE');
        $this->addSql('ALTER TABLE deployments DROP FOREIGN KEY FK_373C43D5ED5CA9E6');
        $this->addSql('ALTER TABLE deployments CHANGE label label VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE domain_name domain_name VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE status status VARCHAR(20) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, CHANGE slug slug VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE organization_user DROP FOREIGN KEY FK_B49AE8D432C8A3DE');
        $this->addSql('ALTER TABLE organization_user DROP FOREIGN KEY FK_B49AE8D4A76ED395');
    }
}
