<?php

namespace App\Controller\Admin;

use App\Entity\ControlNode;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;

class ControlNodeCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ControlNode::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->onlyOnDetail(),
            TextField::new('label'),
            UrlField::new('address'),
            TextField::new('authorizationToken')->onlyOnForms(),
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
