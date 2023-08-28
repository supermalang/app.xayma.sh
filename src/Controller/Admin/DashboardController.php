<?php

namespace App\Controller\Admin;

use App\Entity\AddonsFolder;
use App\Entity\ControlNode;
use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\Service;
use App\Entity\User;
use App\Entity\Settings;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\UserMenu;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\UX\Chartjs\Builder\ChartBuilderInterface;
use Symfony\UX\Chartjs\Model\Chart;
use App\Repository\OrganizationRepository;
use App\Repository\CreditTransactionRepository;

class DashboardController extends AbstractDashboardController
{
    private $adminUrlGenerator;

    public function __construct(AdminUrlGenerator $adminUrlGenerator, ChartBuilderInterface $chartBuilder, OrganizationRepository $organizationRepository, CreditTransactionRepository $creditTransactionRepository)
    {
        $this->adminUrlGenerator = $adminUrlGenerator;
        $this->chartBuilder = $chartBuilder;
        $this->organizationRepository = $organizationRepository;
        $this->creditTransactionRepository = $creditTransactionRepository;
    }

    /**
     * @Route("/", name="admin")
     */
    public function index(): Response
    {
        // Deprecated
        // $routeBuilder = $this->get(AdminUrlGenerator::class)->build();
        $routeBuilder = $this->adminUrlGenerator;

        // Get the credit transactions of the last 24 hours
        $credits = $this->creditTransactionRepository->creditsUsedLast24Hours();
        $creditsUsed = array_column($credits, 'creditsUsed');
        $labelHours = array_column($credits, 'hour');

        $chart = $this->chartBuilder->createChart(Chart::TYPE_LINE);

        $chart->setData([
            'labels' => $labelHours,
            'datasets' => [
                [
                    'label' => 'Credit consumption',
                    'backgroundColor' => 'rgb(255, 99, 132)',
                    'borderColor' => 'rgb(255, 99, 132)',
                    'data' => $creditsUsed,
                ],
            ],
        ]);

        $chart->setOptions([
            'scales' => [
                'y' => [
                    'suggestedMin' => 0,
                    'suggestedMax' => 100,
                ],
            ],
        ]);

        return $this->render('bundles/EasyAdminBundle/page/dashboard.html.twig', [
            'chart' => $chart,
        ]);
        
        //return $this->redirect($routeBuilder->setController(DeploymentsCrudController::class)->generateUrl());
    }

    public function configureDashboard(): Dashboard
    {
        $is_advanced_user = false;
        $firstOrgStatus = $this->getUser()->getOrganizations()[0] ? $this->getUser()->getOrganizations()[0]->getStatus() : null;

        if (count(array_intersect($this->getUser()->getRoles(), ['ROLE_SUPPORT', 'ROLE_ADMIN'])) > 0) {
            // at least user has one of the roles ROLE_SUPPORT or ROLE_ADMIN
            $is_advanced_user = true;
        }

        if ('suspended' == $firstOrgStatus) {
            // user is not advanced and first org is not active, we display the banner notice of suspension
            $this->addFlash('notice-xayma-danger', '<b>Inactive subscribtion</b> : Your account subscription has ended. Please add more credits.');
        }
        if ('on_debt' == $firstOrgStatus) {
            // user is not advanced and first org is not active, we display the banner notice of suspension
            $this->addFlash('notice-xayma-danger', '<b>Negative balance</b> : You do not have any credit left. Please add more credits to avoid suspension.');
        }

        $dashboard = Dashboard::new()
            ->setTitle('<img src="/img/logo.png" style="width:32px;"> Xayma.sh')
            ->generateRelativeUrls()
            ->setFaviconPath('/favicon.png')
        ;

        if(!$is_advanced_user){
            $dashbard->disableDarkMode();
        }

        return $dashboard;
    }

    public function configureMenuItems(): iterable
    {
        return [
            MenuItem::linkToDashboard('Dashboard', 'far fa-chart-bar'),
            MenuItem::section('Mes services'),
            MenuItem::linkToCrud('Applications', 'fas fa-rocket', Deployments::class),
            MenuItem::linkToCrud('Customers', 'far fa-building', Organization::class),
            MenuItem::linkToCrud('Addons', 'fas fa-puzzle-piece', AddonsFolder::class),
            MenuItem::section('Settings')->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Services', 'fab fa-docker', Service::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Control nodes', 'fa fa-sitemap', ControlNode::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Users', 'fas fa-users', User::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Advanced settings', 'fas fa-cog', Settings::class)->setPermission('ROLE_ADMIN'),
        ];
    }

    public function configureUserMenu(UserInterface $user): UserMenu
    {
        $url = $this->adminUrlGenerator
            ->setController(UserCrudController::class)
            ->setAction('detail')
            ->setEntityId($this->getUser()->getId())
            ->generateUrl()
        ;

        return parent::configureUserMenu($user)
            ->setName($user->getFirstName())
            ->displayUserName(true)
            ->addMenuItems([
                MenuItem::linkToUrl('My profile', 'fa fa-id-card', $url),
            ])
        ;
    }
}
