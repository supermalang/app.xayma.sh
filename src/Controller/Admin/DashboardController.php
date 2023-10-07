<?php

namespace App\Controller\Admin;

use App\Entity\AddonsFolder;
use App\Entity\ControlNode;
use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\Service;
use App\Entity\User;
use App\Entity\Settings;
use App\Entity\CreditTransaction;
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
use App\Repository\DeploymentsRepository;
use App\Repository\SettingsRepository;

class DashboardController extends AbstractDashboardController
{
    private $adminUrlGenerator;
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(AdminUrlGenerator $adminUrlGenerator, ChartBuilderInterface $chartBuilder, OrganizationRepository $organizationRepository, CreditTransactionRepository $creditTransactionRepository, DeploymentsRepository $deploymentsRepository, SettingsRepository $settingsRepository)
    {
        $this->adminUrlGenerator = $adminUrlGenerator;
        $this->chartBuilder = $chartBuilder;
        $this->organizationRepository = $organizationRepository;
        $this->creditTransactionRepository = $creditTransactionRepository;
        $this->deploymentsRepository = $deploymentsRepository;
        $this->settingsRepository = $settingsRepository;
    }

    /**
     * @Route("/", name="admin")
     */
    public function index(): Response
    {
        // Deprecated
        // $routeBuilder = $this->get(AdminUrlGenerator::class)->build();
        $routeBuilder = $this->adminUrlGenerator;

        // if user is not admin or support, we only display the last five deployments of the current organization
        if ($this->isAdvancedUser()) {
            $lastFiveDeployments = $this->deploymentsRepository->getLastFiveEditedDeployments();
            $monthlyCreditConsumption = $this->deploymentsRepository->getCurrentMonthlyConsumption();
            $hourlyCreditConsumption = $monthlyCreditConsumption / 720;
            $remainingCredits = 'N/A';
            $costOfCredit = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getCreditPrice();
            $globalMonthlyCostOfCredit = $costOfCredit * $monthlyCreditConsumption;
            $creditPurchases = $this->creditTransactionRepository->getLastPurchases();
        }
        else {
            $lastFiveDeployments = $this->deploymentsRepository->getLastFiveEditedDeployments($this->getUser()->getOrganizations()[0]);
            $monthlyCreditConsumption = $this->deploymentsRepository->getCurrentMonthlyConsumption($this->getUser()->getOrganizations()[0]);
            $hourlyCreditConsumption = $monthlyCreditConsumption / 720;
            $remainingCredits = $this->getUser()->getOrganizations()[0]->getRemainingCredits();
            $creditPurchases = $this->creditTransactionRepository->getLastPurchases($this->getUser()->getOrganizations()[0]->getId());
            $globalMonthlyCostOfCredit = $monthlyCreditConsumption;
        }

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

        $chart->setOptions(['scales' => ['y' => [ 'suggestedMin' => 0, 'suggestedMax' => 10, ],], ]);

        return $this->render('bundles/EasyAdminBundle/page/dashboard.html.twig', [
            'chart' => $chart,
            'lastfivedeps' => $lastFiveDeployments,
            'monthlyCreditConsumption' => $monthlyCreditConsumption,
            'hourlyCreditConsumption' => $hourlyCreditConsumption,
            'remainingCredits' => $remainingCredits,
            'monthCostofCredit' => $globalMonthlyCostOfCredit,
            'creditPurchases' => $creditPurchases,
        ]);
    }

    public function configureDashboard(): Dashboard
    {
        $is_advanced_user = $this->isAdvancedUser();
        $firstOrgStatus = $this->getUser()->getOrganizations()[0] ? $this->getUser()->getOrganizations()[0]->getStatus() : null;

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
            $dashboard->disableDarkMode();
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
            MenuItem::linkToCrud('Credit Transactions', 'fa-solid fa-magnifying-glass-dollar', CreditTransaction::class)->setPermission('ROLE_SUPPORT'),
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

    // function to check if user is admin or support
    public function isAdvancedUser()
    {
        if (count(array_intersect($this->getUser()->getRoles(), ['ROLE_SUPPORT', 'ROLE_ADMIN'])) > 0) {
            // at least user has one of the roles ROLE_SUPPORT or ROLE_ADMIN
            return true;
        } else {
            return false;
        }
    }
}
