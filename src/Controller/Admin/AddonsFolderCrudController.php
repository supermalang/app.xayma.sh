<?php

namespace App\Controller\Admin;

use App\Entity\AddonsFolder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;

class AddonsFolderCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AddonsFolder::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->overrideTemplates([
                'crud/index' => 'admin/addons/index.html.twig',
            ])
        ;
    }
}
