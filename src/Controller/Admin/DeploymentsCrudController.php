<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository as OrmEntityRepository;
use Symfony\Component\Security\Core\Security;

class DeploymentsCrudController extends AbstractCrudController
{
    private $security;

    public function __construct(Security $security)
    {
        $this->security = $security;
    }

    public static function getEntityFqcn(): string
    {
        return Deployments::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Application')
            ->setEntityLabelInPlural('Applications')
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->onlyOnIndex(),
            TextField::new('label'),
            UrlField::new('domainName'),
            AssociationField::new('service'),
            AssociationField::new('organization')->setPermission('ROLE_SUPPORT')->setSortable(false),
            TextField::new('status')->hideOnForm()->addCssClass('text-success lead'),
            DateTimeField::new('created')->onlyOnDetail(),
            TextField::new('createdBy')->onlyOnDetail(),
            DateTimeField::new('modified')->hideOnForm(),
            TextField::new('modifiedBy')->onlyOnDetail(),
        ];
    }

    public function createIndexQueryBuilder(SearchDto $searchDto, EntityDto $entityDto, FieldCollection $fields, FilterCollection $filters): QueryBuilder
    {
        // For the admins we render all applications deployed
        if ($this->isGranted('ROLE_SUPPORT')) {
            return $this->get(OrmEntityRepository::class)
                ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ;
        }

        // For the customers we render only their applications
        $Organizations_array = $this->security->getUser()->getOrganizations()->toArray();
        $Organizations_ids = array_map(function ($e) { return is_object($e) ? $e->getId() : $e['id']; }, $Organizations_array);

        return $this->get(OrmEntityRepository::class)
            ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->where('entity.organization in (:org_ids)')
            ->setParameter('org_ids', implode(', ', $Organizations_ids))
        ;
    }

    public function configureActions(Actions $actions): Actions
    {
        $restartInstance = Action::new('restartInstanceAction', 'Restart', 'fas fa-redo')
            ->linkToCrudAction('stopInstance')
            ->setCssClass('text-warning btn btn-link')
        ;

        $suspendInstance = Action::new('suspendInstanceAction', 'Pause', 'far fa-pause-circle')
            //->displayIf(static function ($entity) {
             //   return $entity->isPublished();
            //})
            ->linkToCrudAction('suspendInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
            ->add(Crud::PAGE_DETAIL, $restartInstance)
            ->add(Crud::PAGE_DETAIL, $suspendInstance)
        ;
    }
}
