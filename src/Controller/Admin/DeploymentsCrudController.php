<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;

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
