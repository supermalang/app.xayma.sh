<?php

namespace App\Controller\Admin;

use App\Entity\Service;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;


class ServiceCrudController extends AbstractCrudController
{
    private $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    public static function getEntityFqcn(): string
    {
        return Service::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        if(!$this->isGranted('ROLE_SUPPORT')) {
            $crud->setSearchFields(null);
        }

        return $crud
            ->setEntityPermission('ROLE_SUPPORT')
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            FormField::addTab('Cluster parameters')->setIcon('cog'),
            AssociationField::new('controleNode')->setRequired(true)->setDefaultColumns(6)->hideOnIndex(),
            TextField::new('label')->setDefaultColumns(6),
            ImageField::new('thumbnail')->setDefaultColumns(6)
                ->setBasePath('/uploads/services/thumbnails/')
                ->setUploadDir('/public/uploads/services/thumbnails/')
                ->setUploadedFileNamePattern(
                    fn (UploadedFile $file): string => sprintf('upload_%d_%s.%s', random_int(1, 999), $file->getFilename(), $file->guessExtension())
                ),
            TextareaField::new('description')->hideOnIndex()->setDefaultColumns(6),
            IntegerField::new('awxId', 'Job Template ID')->onlyOnForms()->setDefaultColumns(6),
            BooleanField::new('isPubliclyAvailable')->setDefaultColumns(6)->hideOnIndex(),
            FormField::addTab('Plans')->setIcon('fa-regular fa-credit-card'),
            FormField::addPanel('Monthly Credit Consumption')->setIcon('fas fa-coins'),
            TextField::new('essentialPlanTag', 'Essentials Plan Tag')->setColumns(6)->hideOnIndex()
                ->setHelp('Put the tag label, then #, then the tag description. Example: "basic#This plan is suitable for a small business with 5 users"'),
            IntegerField::new('monthlyCreditConsumption', 'Essentials - Monthly credit consumption')->setColumns(6)->hideOnIndex(),
            TextField::new('businessPlanTag')->setColumns(6)->hideOnIndex()
                ->setHelp('Put the tag label, then #, then the tag description. Example: "pro#This plan is suitable for enterprises with 50 users"'),
            IntegerField::new('BusinessMonthlyCreditConsumption', 'Business - Monthly credit consumption')->setColumns(6)->hideOnIndex(),
            TextField::new('highPerformancePlanTag')->setColumns(6)->hideOnIndex()
                ->setHelp('Put the tag label, then #, then the tag description. Example: "basic#This plan is suitable for large enterprises with 500 users"'),
            IntegerField::new('HighPerformanceMonthlyCreditConsumption', 'High Performance - Monthly credit consumption')->setColumns(6)->hideOnIndex(),
            FormField::addTab('Deployment tags')->setIcon('fa-solid fa-tags'),
            TextField::new('version', 'Supported versions')->setDefaultColumns(6)
                ->addCssClass('supportedVersions-tagin')
                ->addCssFiles('css/admin/tagin.min.css')
                ->addJsFiles('js/admin/tagin.min.js'),
            TextField::new('deployTags')->hideOnIndex()->setDefaultColumns(6),
            TextField::new('stopTags')->hideOnIndex()->setDefaultColumns(6),
            TextField::new('startTags')->hideOnIndex()->setDefaultColumns(6),
            TextField::new('restartTags')->hideOnIndex()->setDefaultColumns(6),
            TextField::new('editDomainNameTags')->hideOnIndex()->setDefaultColumns(6),
            AssociationField::new('deployments')->hideOnForm()->setDefaultColumns(6),
            FormField::addPanel('Timestamp')->hideOnForm()->setIcon('clock'),
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

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->setPermission(Action::EDIT, 'ROLE_ADMIN')
            ->setPermission(Action::NEW, 'ROLE_ADMIN')
            ->setPermission(Action::DELETE, 'ROLE_ADMIN')
            ->remove(Crud::PAGE_INDEX, Action::DELETE)
            ->remove(Crud::PAGE_INDEX, Action::EDIT)
            ->remove(Crud::PAGE_DETAIL, Action::DELETE)
        ;
    }

    public function showmarketplace(Request $request): Response
    {
        $request->query->remove('plan');
        $request->query->remove('id');

        $serviceRepository = $this->em->getRepository($this->getEntityFqcn());
        
        if ($this->isGranted('ROLE_SUPPORT')) {
            $services = $serviceRepository->findAll();
        }
        else{
            $services = $serviceRepository->findBy(['isPubliclyAvailable' => true]);
        }

        if ($request->isMethod('GET')) {
            return $this->render('bundles/EasyAdminBundle/page/marketplace.html.twig',
            [
                'services' => $services,
            ]);
        }
        else{
            return $this->render('templates/bundles/TwigBundle/Exception/customerror.html.twig');
        }
    }

    public function showserviceplans(Request $request): Response
    {
        // Just to make sure that the options are not visible in the URL bar
        $hashedoptions = [
            'essential' => md5('essentialplan'),
            'business' => md5('businessplan'),
            'performance' => md5('performanceplan'),
        ];

        $entityId = $request->get('id');

        $serviceRepository = $this->em->getRepository($this->getEntityFqcn());
        $service = $serviceRepository->find($entityId);

        return $this->render('bundles/EasyAdminBundle/page/serviceplans.html.twig',
        [
            'servicelabelencoded' => base64_encode($service->getLabel()),
            'service' => $service,
            'options' => $hashedoptions,
        ]);
    }
}
