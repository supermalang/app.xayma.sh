<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\HiddenField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository as OrmEntityRepository;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Symfony\Component\Workflow\Registry;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class DeploymentsCrudController extends AbstractCrudController
{
    private $security;
    private $workflow;

    public function __construct(Security $security, Registry $workflowRegistry, AdminUrlGenerator $crudUrlGenerator, EntityManagerInterface $em, HttpClientInterface $client)
    {
        $this->security = $security;
        $this->workflowRegistry = $workflowRegistry;
        $this->crudUrlGenerator = $crudUrlGenerator;
        $this->em = $em;
        $this->client = $client;
    }

    public static function getEntityFqcn(): string
    {
        return Deployments::class;
    }

    public function configureAssets(Assets $assets): Assets
    {
        return $assets
            ->addHtmlContentToHead('<script src="js/jquery-3.6.0.min.js" ></script>')
        ;
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(ChoiceFilter::new('status')->setChoices([
                'Archived' => 'archived',
                'Active' => 'active',
                'Suspended' => 'suspended',
                'Suspended by admin' => 'suspended_by_admin',
            ]))
        ;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Application')
            ->setEntityLabelInPlural('Applications')
            ->setPageTitle('detail', fn (Deployments $app) => sprintf('Details of App : %s', $app->getSlug()))
            ->setPageTitle('edit', fn (Deployments $app) => sprintf('Editing App : %s', $app->getSlug()))
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        // How admin and helpdesk users can see the fields when creating a new entity
        // - Association field for the service (for dropdown selection of service when creating entity)
        // - Association field for the owner (for dropdown selection of service when creating entity)
        if (($this->isGranted('ROLE_SUPPORT'))) {
            $serviceField = AssociationField::new('service')->hideWhenUpdating();
            $ownerField = AssociationField::new('organization', 'Owner');

            if (Crud::PAGE_NEW === $pageName) {
                $serviceField = $serviceField->addCssClass('ServiceField')->addJsFiles('js/admin/DeploymentsCrud-serviceversion.js');
            }
        }
        // How customers can see the fields when creating a new entity
        // - Association field for the service (for dropdown selection of service when creating entity)
        // - Customer's organization will be automatically chosen as owner org. So customer will not have to select owner.
        elseif (Crud::PAGE_NEW === $pageName) {
            $serviceField = AssociationField::new('service');
            $ownerField = TextField::new('organization', 'Owner')->hideWhenCreating();
        }
        // How customers can see the fields if not creating a new entity
        else {
            $serviceField = TextField::new('service')->hideWhenUpdating();
            $ownerField = TextField::new('organization', 'Owner')->onlyOnDetail();
        }

        return [
            IdField::new('id')->onlyOnIndex()->setPermission('ROLE_SUPPORT'),
            TextField::new('label'),
            TextField::new('slug')->hideWhenCreating()->hideOnIndex()->setDisabled(true),
            UrlField::new('domainName')->setDefaultColumns(5),
            $serviceField->setDefaultColumns(5),
            HiddenField::new('ServiceVersion'),
            $ownerField->setSortable(false)->setDefaultColumns(5)->hideWhenUpdating(),
            TextField::new('status')->hideOnForm()->addCssClass('text-success lead'),
            DateTimeField::new('created')->onlyOnDetail(),
            TextField::new('createdBy')->onlyOnDetail(),
            DateTimeField::new('modified')->onlyOnDetail(),
            TextField::new('modifiedBy')->onlyOnDetail(),
        ];
    }

    public function createIndexQueryBuilder(SearchDto $searchDto, EntityDto $entityDto, FieldCollection $fields, FilterCollection $filters): QueryBuilder
    {
        // For the admins we render all applications deployed
        if ($this->isGranted('ROLE_SUPPORT')) {
            return $this
                ->container->get(OrmEntityRepository::class)
            // get(EntityRepository::class)
                ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ;
        }

        // For the customers we render only their applications that are not archived
        $Organizations_array = $this->security->getUser()->getOrganizations()->toArray();
        $Organizations_ids = array_map(function ($e) { return is_object($e) ? $e->getId() : $e['id']; }, $Organizations_array);

        return $this->get(OrmEntityRepository::class)
            ->createQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->where("entity.organization in (:org_ids) and entity.status <> 'archived'")
            ->setParameter('org_ids', implode(', ', $Organizations_ids))
        ;
    }

    public function configureActions(Actions $actions): Actions
    {
        $restartInstance = Action::new('restartInstanceAction', 'Restart', 'fas fa-redo')
            ->linkToCrudAction('restartInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        $suspendInstance = Action::new('suspendInstance', 'Pause', 'far fa-pause-circle')
            ->displayIf(static function ($entity) { return 'active' == $entity->getStatus(); })
            ->linkToCrudAction('suspendInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        $adminSuspendInstance = Action::new('adminSuspendInstance', 'Disable', 'far fa-pause-circle')
            ->displayIf(static function ($entity) { return 'active' == $entity->getStatus(); })
            ->linkToCrudAction('adminSuspendInstance')
            ->setCssClass('text-danger btn btn-link')
            ;

        $reactivateInstance = Action::new('reactivateInstance', 'Start', 'far fa-play-circle')
            ->displayIf(static function ($entity) { return 'suspended' == $entity->getStatus(); })
            ->linkToCrudAction('activateInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        $adminReactivateInstance = Action::new('adminReactivateInstance', 'Enable', 'far fa-pause-circle')
            ->displayIf(static function ($entity) { return 'suspended_by_admin' == $entity->getStatus(); })
            ->linkToCrudAction('adminActivateInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        $archiveInstance = Action::new('archiveInstance', 'Archive', 'far fa-pause-circle')
            ->displayIf(static function ($entity) { return in_array($entity->getStatus(), ['suspended_by_admin', 'suspended', 'stopped']); })
            ->linkToCrudAction('archiveInstance')
            ->setCssClass('text-danger btn btn-link')
        ;

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_INDEX, Action::EDIT)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
            ->add(Crud::PAGE_DETAIL, $archiveInstance)
            ->add(Crud::PAGE_DETAIL, $adminSuspendInstance)
            ->add(Crud::PAGE_DETAIL, $adminReactivateInstance)
            ->add(Crud::PAGE_DETAIL, $suspendInstance)
            ->add(Crud::PAGE_DETAIL, $reactivateInstance)
            ->setPermission($adminSuspendInstance, 'ROLE_SUPPORT')
            ->setPermission($adminReactivateInstance, 'ROLE_SUPPORT')
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

            $indexUrl = $this->get(AdminUrlGenerator::class)->setController(DeploymentsCrudController::class)->setAction(Action::INDEX)->generateUrl();

            return $this->redirect($indexUrl);
        }
    }

    public function suspendInstance(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $job_tags = $entity->getService()->getSuspendTags();

        $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
        $this->updateDeployment($entity, $job_tags_);

        return $this->fireTransition($context, 'suspend');
    }

    public function adminSuspendInstance(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $job_tags = $entity->getService()->getSuspendTags();

        $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
        $this->updateDeployment($entity, $job_tags_);

        return $this->fireTransition($context, 'admin_suspend');
    }

    public function activateInstance(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $job_tags = $entity->getService()->getStartTags();

        $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
        $this->updateDeployment($entity, $job_tags_);

        return $this->fireTransition($context, 'reactivate');
    }

    public function adminActivateInstance(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $job_tags = $entity->getService()->getStartTags();

        $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
        $this->updateDeployment($entity, $job_tags_);

        return $this->fireTransition($context, 'admin_reactivate');
    }

    public function restartInstance(AdminContext $context)
    {
        $this->suspendInstance($context);
        $this->activateInstance($context);
    }

    public function archiveInstance(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->getDoctrine()->getRepository($this->getEntityFqcn())->find($id);
        $job_tags = $entity->getService()->getSuspendTags();

        $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
        $this->updateDeployment($entity, $job_tags_);

        $this->fireTransition($context, 'suspended_to_archive');

        $this->fireTransition($context, 'suspended_by_admin_to_archive');

        return $this->fireTransition($context, 'stopped_to_archive');
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entity): void
    {
        $qb = $entityManager->createQueryBuilder('d')->select('d.domainName')->from(Deployments::class, 'd')
            ->where('d.domainName = :domain')->setParameter('domain', $entity->getDomainName());

        $query = $qb->getQuery();
        $is_dname_in_db = $query->setMaxResults(1)->getOneOrNullResult();

        // Check whether domain name has changed (different from what is saved in the DB)
        // If yes, we launch the service to update the deployment in AWX
        if (null == $is_dname_in_db) {
            $job_tags = $entity->getService()->getEditDomainNameTags();

            $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;
            $this->updateDeployment($entity, $job_tags_);
        }

        $entityManager->persist($entity);
        $entityManager->flush();
    }

    public function updateDeployment(Deployments $entity, $job_tags)
    {
        $awxId = $entity->getService()->getAwxId();
        $controlNodeUrl = $entity->getService()->getControleNode()->getAddress()
            .'/api/v2/job_templates/'.$awxId.'/launch/';
        $authToken = $entity->getService()->getControleNode()->getAuthorizationToken();

        // Deprecated
        // $slugger = new AsciiSlugger();
        // $instance_slug = strtolower($slugger->slug($entity->getLabel())->toString());

        $instance_slug = $entity->getSlug();
        $organization = strtolower(preg_replace('/\s+/', '', $entity->getOrganization()->getLabel()));
        $version = $entity->getServiceVersion();

        $headers = ['Content-Type' => 'application/json', 'Authorization' => 'Bearer '.$authToken];

        $domain = str_replace('http://', '', $entity->getDomainName());
        $domain = str_replace('https://', '', $domain);

        $extra_vars = ['organization' => $organization, 'instancename' => $instance_slug, 'domain' => $domain, 'version' => $version];

        return $this->client->request(
            'POST',
            $controlNodeUrl,
            ['headers' => $headers, 'json' => ['extra_vars' => $extra_vars, 'job_tags' => $job_tags]]
        );
    }
}
