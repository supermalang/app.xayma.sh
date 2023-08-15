<?php

namespace App\Controller\Admin;

use App\Entity\CreditTransaction;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;

class CreditTransactionCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return CreditTransaction::class;
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
