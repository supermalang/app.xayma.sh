<?php

namespace App\Controller\Admin;

use App\Entity\Service;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class ServiceCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Service::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')
                ->onlyOnIndex()->onlyOnDetail(),
            TextField::new('label'),
            TextareaField::new('description')->hideOnIndex(),
            TextField::new('tags'),
            TextField::new('skipTags'),
            TextField::new('variables'),
            AssociationField::new('controleNode'),
            AssociationField::new('deployments')
                ->hideOnForm(),
            DateTimeField::new('created')
                ->onlyOnDetail(),
            AssociationField::new('createdBy')
                ->onlyOnDetail(),
            DateTimeField::new('modified')
                ->onlyOnDetail(),
            AssociationField::new('modifiedBy')
                ->onlyOnDetail(),
        ];
    }
}
