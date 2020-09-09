<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;

class DeploymentsCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Deployments::class;
    }

    /*public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Deployment')
            ->setEntityLabelInPlural('Deployments')
        ;
    }*/

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->onlyOnIndex(),
            TextField::new('label'),
            UrlField::new('domainName'),
            AssociationField::new('service'),
            AssociationField::new('organization'),
            TextField::new('status')->hideOnForm(),
            DateTimeField::new('created')->hideOnForm(),
            TextField::new('updateInfo', 'Modified')->hideOnForm(),
        ];
    }
}
