<?php

namespace App\Controller\Admin;

use App\Entity\Deployments;
use App\Service\OrgHelper;
use App\Service\AwxHelper;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use EasyCorp\Bundle\EasyAdminBundle\Orm\EntityRepository as OrmEntityRepository;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\Workflow\Registry;
use Symfony\Component\HttpFoundation\RequestStack;
use App\Repository\ServiceRepository;
use Symfony\Component\Messenger\MessageBusInterface;
use App\Message\UpdateDeploymentMessage;


class DeploymentsCrudController extends AbstractCrudController
{
    private $security;
    private $workflowRegistry;
    private $requestStack;
    private $em;
    private $awxHelper;
    private $applabel;
    private $serviceRepository;
    private $bus;


    public function __construct(Security $security, Registry $workflowRegistry, EntityManagerInterface $em, private ManagerRegistry $doctrine, private OrgHelper $orgHelper, AwxHelper $awxHelper, RequestStack $requestStack, ServiceRepository $serviceRepository, MessageBusInterface $bus)
    {
        $this->security = $security;
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->orgHelper = $orgHelper;
        $this->awxHelper = $awxHelper;
        $this->requestStack = $requestStack;
        $this->serviceRepository = $serviceRepository;
        $this->bus = $bus;
        
        $this->applabel =  base64_decode($this->requestStack->getCurrentRequest()->query->get('app')) ?? null;
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
            ]))
        ;
    }

    public function configureCrud(Crud $crud): Crud
    {
        $deploymentplanHashed =  $this->requestStack->getCurrentRequest()->query->get('plan') ?? null;
        $deploymentplan = null;

        if (md5('businessplan') == $deploymentplanHashed) {
            $deploymentplan = 'business';
        } 
        if (md5('performanceplan') == $deploymentplanHashed) {
            $deploymentplan = 'performance';
        } 
        if(md5('essentialplan') == $deploymentplanHashed){
            $deploymentplan = 'essentials';
        }

        return $crud
            ->setEntityLabelInSingular('Deployment')
            ->setEntityLabelInPlural('Applications Deployed')
            ->setPageTitle('detail', fn (Deployments $app) => sprintf('Details of App : %s', $app->getSlug()))
            ->setPageTitle('edit', fn (Deployments $app) => sprintf('Editing App : %s', $app->getSlug()))
            ->setPageTitle('new', fn () => sprintf("Deploy a new %s - %s service", $this->applabel, $deploymentplan ? ucfirst(strtolower($deploymentplan)) : ''))
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        $serviceField = TextField::new('service')->onlyOnDetail();

        /** We use this js file to retrieve the service's versions */
        $emptyrow = FormField::addRow()->onlyWhenCreating()->setCssClass('ServiceField')->addJsFiles('js/admin/DeploymentsCrud-serviceversion.js');

        // How admin and helpdesk users can see the fields when creating a new entity
        // - Association field for the owner (for dropdown selection of service when creating entity)
        if ($this->isGranted('ROLE_SUPPORT')) {
            $ownerField = AssociationField::new('organization', 'Owning Customer');
        }
        // How customers can see the fields when creating a new entity
        // - Customer's organization will be automatically chosen as owner org. So customer will not have to select owner.
        elseif (Crud::PAGE_NEW === $pageName) {
            $ownerField = TextField::new('organization', 'Owning Customer')->hideWhenCreating();
        }
        // How customers can see the fields if not creating a new entity
        else {
            $ownerField = TextField::new('organization', 'Owning Customer')->onlyOnDetail();
        }

        $serviceFullLabelField = TextField::new('serviceFullLabel', 'Service')->onlyOnIndex()->setSortable(false);
        $serviceFullLabelField->setTemplatePath('bundles/EasyAdminBundle/default/field/service-full-label.html.twig');

        return [
            IdField::new('id')->onlyOnIndex()->setPermission('ROLE_SUPPORT'),
            $ownerField->setSortable(false)->setDefaultColumns(5)->hideWhenUpdating(),
            TextField::new('label')->setDefaultColumns(5),
            TextField::new('slug')->hideWhenCreating()->hideOnIndex()->setDisabled(true),
            UrlField::new('domainName')->setDefaultColumns(5)->setSortable(false),
            $serviceField,
            $serviceFullLabelField,
            $emptyrow,
            HiddenField::new('ServiceVersion')->setCssClass('col-md-5')->hideOnIndex(), // Managed by the js file
            HiddenField::new('deploymentPlan')->hideOnIndex(),
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

        return $this->doctrine->getRepository(Deployments::class)->createQueryBuilder('entity')
            ->where("entity.organization in (:org_ids) and entity.status <> 'archived'")
            ->setParameter('org_ids', implode(', ', $Organizations_ids))
        ;
    }

    public function configureActions(Actions $actions): Actions
    {
        $restartApp = Action::new('restartAppAction', 'Restart', 'fas fa-redo')
            ->displayIf(static function ($entity) { return 'active' == $entity->getStatus(); })
            ->linkToCrudAction('restartApp')
            ->setCssClass('text-warning btn btn-link')
        ;
        $stopApp = Action::new('stopAppAction', 'Stop', 'far fa-stop-circle')
            ->displayIf(static function ($entity) { return 'active' == $entity->getStatus(); })
            ->linkToCrudAction('stopApp')
            ->setCssClass('text-danger btn btn-link')
        ;
        $startApp = Action::new('startAppAction', 'Start', 'fa fa-play-circle-o')
            ->displayIf(static function ($entity) { return 'stopped' == $entity->getStatus(); })
            ->linkToCrudAction('startApp')
            ->setCssClass('text-success btn btn-link')
        ;

        $archiveApp = Action::new('archiveAppAction', 'Archive', 'fa fa-archive')
            ->displayIf(static function ($entity) { return in_array($entity->getStatus(), ['suspended', 'stopped']); })
            ->linkToCrudAction('archiveApp')
            ->setCssClass('text-danger btn btn-link')
        ;

        $gotomarketplace = Action::new('gotomarketplace', 'Go to marketplace', 'fas fa-store')
            ->linkToUrl(fn() => $this->container->get(AdminUrlGenerator::class)->setController(ServiceCrudController::class)->setAction('showmarketplace')->generateUrl())
            ->setCssClass('btn btn-primary')
            ->createAsGlobalAction()
        ;

        // If org is suspended or archived, or there is no enough credits, we disable all actions except read only, for the customers
        if ($this->orgHelper->isCustomerOrgSuspended($this->getUser())  || $this->orgHelper->isCustomerOrgCreditsFinished($this->getUser())) {
            return $actions
                ->add(Crud::PAGE_INDEX, Action::DETAIL)
                ->add(Crud::PAGE_INDEX, $gotomarketplace)
                ->remove(Crud::PAGE_INDEX, Action::NEW)
                ->setPermission(Action::DELETE, 'ROLE_SUPPORT')
                ->setPermission(Action::EDIT, 'ROLE_SUPPORT')
                ->setPermission($archiveApp, 'ROLE_SUPPORT')
                ->setPermission($startApp, 'ROLE_SUPPORT')
                ->setPermission($stopApp, 'ROLE_SUPPORT')
                ->setPermission($restartApp, 'ROLE_SUPPORT')
            ;
        }

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, $gotomarketplace)
            ->remove(Crud::PAGE_INDEX, Action::NEW)
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_INDEX, Action::EDIT)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
            ->remove(Crud::PAGE_NEW, Action::SAVE_AND_ADD_ANOTHER)
            ->add(Crud::PAGE_DETAIL, $archiveApp)
            ->add(Crud::PAGE_DETAIL, $startApp)
            ->add(Crud::PAGE_DETAIL, $stopApp)
            ->add(Crud::PAGE_DETAIL, $restartApp)
        ;
    }

    /**
     * Apply the desired workflow transition from one state to another and redirect to the list view.
     * This is for the manual actions. It only updates the status value, then the workflow event subscribers will take it from there.
     *
     * @param string $transition Transition fo fire
     */
    public function fireTransition(AdminContext $context, string $transition)
    {
        $id = $context->getRequest()->query->get('entityId');
        $entity = $this->doctrine->getRepository($this->getEntityFqcn())->find($id);
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($entity, $transition)) {
            $workflow->apply($entity, $transition);
            $this->updateEntity($this->em, $entity);

            $indexUrl = $this->container->get(AdminUrlGenerator::class)->setController(DeploymentsCrudController::class)->setAction(Action::INDEX)->generateUrl();

            return $this->redirect($indexUrl);
        }
    }

    public function stopApp(AdminContext $context)
    {
        return $this->fireTransition($context, 'stop');
    }

    public function startApp(AdminContext $context)
    {
        return $this->fireTransition($context, 'start');
    }

    /** We are not managing this through the workflow manager as for this specific use case we want to avoid having an extra status in the workflow */
    public function restartApp(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');
        $deployment = $this->doctrine->getRepository($this->getEntityFqcn())->find($id);

        $service = $this->serviceRepository->find($deployment->getService()->getId());
        $restart_tags = $service->getRestartTags();
        $job_tags = is_array($restart_tags) ? implode(', ', $restart_tags) : $restart_tags;

        $this->bus->dispatch(new UpdateDeploymentMessage($deployment->getId(), $job_tags));

        $indexUrl = $this->container->get(AdminUrlGenerator::class)->setController(DeploymentsCrudController::class)->setAction(Action::INDEX)->generateUrl();
        return $this->redirect($indexUrl);
    }

    public function archiveApp(AdminContext $context)
    {
        return $this->fireTransition($context, 'archive');
    }

    /**
     * Update the deployment entity in the database
     * Ex: the domain name
     * 
     * TODO: Add possibility to update the size/dimension of the app
     */
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

            // Deprecated
            // $this->awxHelper->updateDeployment($entity, $job_tags_);
        }

        $entityManager->persist($entity);
        $entityManager->flush();
    }
}