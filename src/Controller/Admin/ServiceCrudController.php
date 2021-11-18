<?php

namespace App\Controller\Admin;

use App\Entity\Service;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class ServiceCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Service::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityPermission('ROLE_SUPPORT')
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('label'),
            TextareaField::new('description')->hideOnIndex(),
            AssociationField::new('controleNode')->setRequired(true),
            IntegerField::new('awxId', 'Job Template ID')->onlyOnForms(),
            IdField::new('version'),
            TextField::new('deployTags')->onlyOnForms(),
            TextField::new('stopTags')->onlyOnForms(),
            TextField::new('startTags')->onlyOnForms(),
            TextField::new('suspendTags')->onlyOnForms(),
            TextField::new('editDomainNameTags')->onlyOnForms(),
            AssociationField::new('deployments')->hideOnForm(),
            DateTimeField::new('created')->onlyOnDetail(),
            AssociationField::new('createdBy')->onlyOnDetail(),
            DateTimeField::new('modified')->onlyOnDetail(),
            AssociationField::new('modifiedBy')->onlyOnDetail(),
        ];
    }
}
