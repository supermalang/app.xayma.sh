<?php

namespace App\Controller\Admin;

use App\Entity\ControlNode;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
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
            TextField::new('label'),
            UrlField::new('address'),
        ];
    }
}
