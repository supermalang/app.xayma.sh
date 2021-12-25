<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20211225130325 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE arrosage DROP FOREIGN KEY arrosage_ibfk_1');
        $this->addSql('ALTER TABLE pertes DROP FOREIGN KEY pertes_ibfk_1');
        $this->addSql('ALTER TABLE photo DROP FOREIGN KEY photo_ibfk_1');
        $this->addSql('ALTER TABLE remplacement DROP FOREIGN KEY remplacement_ibfk_1');
        $this->addSql('ALTER TABLE axe DROP FOREIGN KEY axe_ibfk_1');
        $this->addSql('ALTER TABLE arrosage DROP FOREIGN KEY arrosage_ibfk_2');
        $this->addSql('ALTER TABLE axe DROP FOREIGN KEY axe_ibfk_2');
        $this->addSql('ALTER TABLE axe DROP FOREIGN KEY axe_ibfk_3');
        $this->addSql('DROP TABLE arrosage');
        $this->addSql('DROP TABLE asso_esp_axe');
        $this->addSql('DROP TABLE axe');
        $this->addSql('DROP TABLE campagnes');
        $this->addSql('DROP TABLE espece');
        $this->addSql('DROP TABLE participants');
        $this->addSql('DROP TABLE pertes');
        $this->addSql('DROP TABLE photo');
        $this->addSql('DROP TABLE qv');
        $this->addSql('DROP TABLE remplacement');
        $this->addSql('DROP TABLE type');
        $this->addSql('ALTER TABLE organization ADD description LONGTEXT DEFAULT NULL, ADD phone VARCHAR(13) DEFAULT NULL, ADD email VARCHAR(320) DEFAULT NULL, ADD address LONGTEXT DEFAULT NULL, ADD category VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE arrosage (id_axe INT NOT NULL, id_participant INT NOT NULL, INDEX id_participant (id_participant), INDEX IDX_78E734CAF2CEF676 (id_axe), PRIMARY KEY(id_axe, id_participant)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE asso_esp_axe (id_espece INT NOT NULL, id_axe INT NOT NULL, PRIMARY KEY(id_espece, id_axe)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE axe (id_axe INT AUTO_INCREMENT NOT NULL, id_camp INT NOT NULL, id_qv INT NOT NULL, id_type INT NOT NULL, libelle_axe VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, nb_arbres INT NOT NULL, date_prevue DATE NOT NULL, date_reelle DATE NOT NULL, responsable VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, INDEX id_camp (id_camp), INDEX id_type (id_type), INDEX id_qv (id_qv), PRIMARY KEY(id_axe)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE campagnes (id_camp INT AUTO_INCREMENT NOT NULL, nom_camp VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, annee DATE NOT NULL, PRIMARY KEY(id_camp)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE espece (id_espece INT AUTO_INCREMENT NOT NULL, nom_espece VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, PRIMARY KEY(id_espece)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE participants (id_participant INT AUTO_INCREMENT NOT NULL, nom VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, prenom VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, PRIMARY KEY(id_participant)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE pertes (id_pertes INT AUTO_INCREMENT NOT NULL, id_axe INT NOT NULL, date_observation DATE NOT NULL, nb_pertes INT DEFAULT NULL, recommandation VARCHAR(150) CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_general_ci`, INDEX id_axe (id_axe), PRIMARY KEY(id_pertes)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE photo (id_photo INT AUTO_INCREMENT NOT NULL, id_axe INT NOT NULL, nom_photo VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, date_creation DATE DEFAULT NULL, INDEX id_axe (id_axe), PRIMARY KEY(id_photo)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE qv (id_qv INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, id_commune INT DEFAULT NULL, INDEX id_participant (id_commune), PRIMARY KEY(id_qv)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE remplacement (id_remp INT AUTO_INCREMENT NOT NULL, id_axe INT NOT NULL, libelle_remp VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, INDEX id_axe (id_axe), PRIMARY KEY(id_remp)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE type (id_type INT AUTO_INCREMENT NOT NULL, libelle VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, PRIMARY KEY(id_type)) DEFAULT CHARACTER SET utf8 COLLATE `utf8_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE arrosage ADD CONSTRAINT arrosage_ibfk_1 FOREIGN KEY (id_axe) REFERENCES axe (id_axe)');
        $this->addSql('ALTER TABLE arrosage ADD CONSTRAINT arrosage_ibfk_2 FOREIGN KEY (id_participant) REFERENCES participants (id_participant)');
        $this->addSql('ALTER TABLE axe ADD CONSTRAINT axe_ibfk_1 FOREIGN KEY (id_camp) REFERENCES campagnes (id_camp) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE axe ADD CONSTRAINT axe_ibfk_2 FOREIGN KEY (id_qv) REFERENCES qv (id_qv) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE axe ADD CONSTRAINT axe_ibfk_3 FOREIGN KEY (id_type) REFERENCES type (id_type) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE pertes ADD CONSTRAINT pertes_ibfk_1 FOREIGN KEY (id_axe) REFERENCES axe (id_axe) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE photo ADD CONSTRAINT photo_ibfk_1 FOREIGN KEY (id_axe) REFERENCES axe (id_axe) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE remplacement ADD CONSTRAINT remplacement_ibfk_1 FOREIGN KEY (id_axe) REFERENCES axe (id_axe) ON UPDATE CASCADE');
        $this->addSql('ALTER TABLE organization DROP description, DROP phone, DROP email, DROP address, DROP category');
    }
}
