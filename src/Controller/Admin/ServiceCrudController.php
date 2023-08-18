<?php

namespace App\Controller\Admin;

use App\Entity\Service;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class ServiceCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Service::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityPermission('ROLE_SUPPORT')
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('label')->setDefaultColumns(5),
            TextareaField::new('description')->hideOnIndex()->setDefaultColumns(5),
            AssociationField::new('controleNode')->setRequired(true)->setDefaultColumns(5),
            IntegerField::new('awxId', 'Job Template ID')->onlyOnForms()->setDefaultColumns(5),
            TextField::new('version', 'Supported versions')->setDefaultColumns(5)
            ->addCssClass('supportedVersions-tagin')
            ->addCssFiles('css/admin/tagin.min.css')
            ->addJsFiles('js/admin/tagin.min.js'),
            IntegerField::new('monthlyCreditConsumption', 'Monthly Credit Consumption')->setDefaultColumns(5),
            NumberField::new('hourlyCreditConsumption', 'Hourly Credit Consumption')->hideOnForm()->setDefaultColumns(5),
            TextField::new('deployTags')->onlyOnForms()->setDefaultColumns(5),
            TextField::new('stopTags')->onlyOnForms()->setDefaultColumns(5),
            TextField::new('startTags')->onlyOnForms()->setDefaultColumns(5),
            TextField::new('suspendTags')->onlyOnForms()->setDefaultColumns(5),
            TextField::new('editDomainNameTags')->onlyOnForms()->setDefaultColumns(5),
            AssociationField::new('deployments')->hideOnForm()->setDefaultColumns(5),
            DateTimeField::new('created')->onlyOnDetail(),
            AssociationField::new('createdBy')->onlyOnDetail(),
            DateTimeField::new('modified')->onlyOnDetail(),
            AssociationField::new('modifiedBy')->onlyOnDetail(),
        ];
    }

    public function configureAssets(Assets $assets): Assets
    {
        return $assets
            ->addHtmlContentToBody('<script src="js/admin/ServiceCrud-supportedversions.js" type="module" defer></script>')
        ;
    }
}
