<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use Doctrine\ORM\EntityManagerInterface;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository as OrmEntityRepository;
use EasyCorp\Bundle\EasyAdminBundle\Router\CrudUrlGenerator;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\Workflow\Registry;

class DeploymentsCrudController extends AbstractCrudController
{
    private $security;
    private $workflow;

    public function __construct(Security $security, Registry $workflowRegistry, CrudUrlGenerator $crudUrlGenerator, EntityManagerInterface $em)
    {
        $this->security = $security;
        $this->workflowRegistry = $workflowRegistry;
        $this->crudUrlGenerator = $crudUrlGenerator;
        $this->em = $em;
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

        $suspendInstance = Action::new('suspendInstance', 'Pause', 'far fa-pause-circle')
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

    /**
     * Run transition from one state to another and redirect to the list view.
     *
     * @param string $transition Transition fo fire
     */
    public function fireTransition(AdminContext $context, string $transition)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($entity, $transition)) {
            $workflow->apply($entity, $transition);
            $entity->setModified(new \DateTime());
            $entity->setModifiedBy($this->security->getUser());
            $this->updateEntity($this->em, $entity);
        }

        $url = $this->crudUrlGenerator->build()
            ->setController(DeploymentsCrudController::class)
            ->setAction(Action::INDEX)
            ->generateUrl()
        ;

        return $this->redirect($url);
    }

    public function suspendInstance(AdminContext $context)
    {
        return $this->fireTransition($context, 'suspend');
    }
}
