<?php

namespace App\Controller\Admin;

use App\Entity\Settings;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Field\MoneyField;


class SettingsCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Settings::class;
    }

    
    public function configureFields(string $pageName): iterable
    {
        return [
            FormField::addTab('Credits & Payments')->setIcon('wallet'),
            MoneyField::new('CreditPrice')->setCurrency('XOF')->setNumDecimals(0)->setStoredAsCents(false)->setColumns(6),
            IntegerField::new('LowCreditThreshold')->setColumns(6),
            IntegerField::new('MaxCreditsDebt')->setColumns(6),
            TextField::new('paymentApiKey')->setColumns(6),
            TextField::new('paymentSecretKey')->setColumns(6),
            UrlField::new('PaymentSuccessUrl')->setColumns(6),
            UrlField::new('PaymentCancelUrl')->setColumns(6),
            UrlField::new('PaymentIpnUrl')->setColumns(6),
            FormField::addTab('Organizations & Deployments')->setIcon('building'),
            IntegerField::new('MaxDaysToArchiveDepl')->setColumns(6),
            IntegerField::new('MaxDaysToDeleteDepl')->setColumns(6),
            IntegerField::new('MaxDaysToArchiveOrgs')->setColumns(6),
            IntegerField::new('MaxDaysToDeleteOrgs')->setColumns(6),
            FormField::addTab('Timestamp')->hideOnForm()->setIcon('clock'),
            DateTimeField::new('created')->hideOnForm()->setColumns(6),
            AssociationField::new('createdBy')->hideOnForm()->setColumns(6),
            DateTimeField::new('modified')->hideOnForm()->setColumns(6),
            AssociationField::new('modifiedBy')->hideOnForm()->setColumns(6),
        ];
    }
    

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_INDEX, Action::NEW)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
            ->remove(Crud::PAGE_DETAIL, Action::INDEX)
            ->setPermission(Action::NEW, 'ROLE_ADMIN')
            ->setPermission(Action::EDIT, 'ROLE_ADMIN')
            ->setPermission(Action::DELETE, 'ROLE_ADMIN')
        ;
    }

    
}
