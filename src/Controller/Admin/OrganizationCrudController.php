<?php

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Service\OrgHelper;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TelephoneField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository as OrmEntityRepository;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Security\Core\Security;

class OrganizationCrudController extends AbstractCrudController
{
    public function __construct(Security $security, OrgHelper $orgHelper)
    {
        $this->security = $security;
        $this->orgHelper = $orgHelper;
    }

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
            IdField::new('id')->onlyOnIndex()->setPermission('ROLE_SUPPORT'),
            TextField::new('label')->setColumns(7),
            TextField::new('slug')->onlyOnDetail()->setPermission('ROLE_SUPPORT')->setColumns(7),
            ChoiceField::new('category', 'Activity area')
                ->setChoices($this->orgHelper->getCategories())
                ->allowMultipleChoices()
                ->setHelp('You can select a maximum of 03 activity areas')
                ->setColumns(7),
            TextareaField::new('description')
                ->hideOnIndex()
                ->setHelp('You can give here a short introductory description of what is your activity about.')
                ->setColumns(7),
            EmailField::new('email', 'E-mail')->setColumns(7),
            TelephoneField::new('phone')->hideOnIndex()->setColumns(7),
            TextareaField::new('address')->hideOnIndex()->setColumns(7),
            TextField::new('status')->hideOnForm(),
            DateTimeField::new('created')->onlyOnDetail(),
            TextField::new('createdBy')->onlyOnDetail()->setPermission('ROLE_SUPPORT'),
        ];
    }

    public function createIndexQueryBuilder(SearchDto $searchDto, EntityDto $entityDto, FieldCollection $fields, FilterCollection $filters): QueryBuilder
    {
        // For the admins we render all organizations
        if ($this->isGranted('ROLE_SUPPORT')) {
            return $this->get(OrmEntityRepository::class)
                ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ;
        }

        // For the customers we render only their organization
        $Organizations_array = $this->security->getUser()->getOrganizations()->toArray();
        $Organizations_ids = array_map(function ($e) { return is_object($e) ? $e->getId() : $e['id']; }, $Organizations_array);

        return $this->get(OrmEntityRepository::class)
            ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->where('entity.id in (:org_ids)')
            ->setParameter('org_ids', implode(', ', $Organizations_ids))
        ;
    }

    public function configureActions(Actions $actions): Actions
    {
        $editMembers = Action::new('editMembers', 'Edit Members', 'fas fa-user-edit')
            ->linkToCrudAction('editMembers')
            ->setCssClass('text-warning btn btn-link')
        ;

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $editMembers)
            ->setPermission(Action::NEW, 'ROLE_SUPPORT')
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_INDEX, Action::EDIT)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
        ;
    }

    public function editMembers(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');

        //$organizationToUpdate = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);

        $editMembersUrl = $this->get(AdminUrlGenerator::class)->setController(Organization2CrudController::class)->setAction('edit')->setEntityId($id);

        return $this->redirect($editMembersUrl->generateUrl());
    }
}
