<?php

namespace App\Controller\Admin;

use App\Entity\ControlNode;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;

class ControlNodeCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ControlNode::class;
    }

    /*
    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id'),
            TextField::new('title'),
            TextEditorField::new('description'),
        ];
    }
    */
}
