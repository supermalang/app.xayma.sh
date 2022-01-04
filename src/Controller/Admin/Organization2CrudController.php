<?php

namespace App\Controller\Admin;

use App\Entity\Organization;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TelephoneField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class Organization2CrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Organization::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Customer')
            ->setEntityLabelInPlural('Customers')
            ->setPageTitle('detail', fn (Organization $app) => sprintf('Details of Customer : %s', $app->getLabel()))
            ->setPageTitle('edit', fn (Organization $app) => sprintf('Editing Customer details : %s', $app->getLabel()))
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            TextField::new('label')->setDefaultColumns(4)->setDisabled(),
            TextField::new('slug')->setDefaultColumns(4)->setPermission('ROLE_SUPPORT')->setDisabled(),
            EmailField::new('email', 'E-mail')->setDefaultColumns(4)->setDisabled(),
            TelephoneField::new('phone')->setDefaultColumns(4)->setDisabled(),
            AssociationField::new('members')->setColumns(4),
        ];
    }
}
