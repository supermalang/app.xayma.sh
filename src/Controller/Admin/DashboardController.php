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
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use Symfony\Component\HttpFoundation\RequestStack;

class DashboardController extends AbstractDashboardController
{
    private $adminUrlGenerator;
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(AdminUrlGenerator $adminUrlGenerator, ChartBuilderInterface $chartBuilder, OrganizationRepository $organizationRepository, CreditTransactionRepository $creditTransactionRepository, DeploymentsRepository $deploymentsRepository, SettingsRepository $settingsRepository, RequestStack $requestStack)
    {
        $this->adminUrlGenerator = $adminUrlGenerator;
        $this->chartBuilder = $chartBuilder;
        $this->organizationRepository = $organizationRepository;
        $this->creditTransactionRepository = $creditTransactionRepository;
        $this->deploymentsRepository = $deploymentsRepository;
        $this->settingsRepository = $settingsRepository;
        $this->requestStack = $requestStack;
    }

    /**
     * @Route("/", name="admin")
     */
    public function index(): Response
    {
        $request = $this->requestStack->getCurrentRequest();
        $cts = $request->query->get('cts') ?? null; // Credit transaction status

        if ($cts == 'success' || $cts == 'completed' || $cts == 'paid' || $cts == 'approved' || $cts == 'successful') {
            $this->addFlash('success', '<b>Success</b> : Your payment was successful. Thank you for your purchase. Your credits will be added to your account shortly.');
        }
        if ($cts == 'cancel' || $cts == 'error' || $cts == 'failed') {
            $this->addFlash('danger', '<b>Failed</b> : Your payment was not successful. Please try again.');
        }

        $routeBuilder = $this->adminUrlGenerator;

        // if user is admin or support, we display the last five deployments of all organizations
        if ($this->isAdvancedUser()) {
            $lastFiveDeployments = $this->deploymentsRepository->getLastFiveEditedDeployments();
            $monthlyCreditConsumption = $this->deploymentsRepository->getCurrentMonthlyConsumption();
            $hourlyCreditConsumption = $monthlyCreditConsumption / 720;
            $remainingCredits = 'N/A';
            $costOfCredit = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getCreditPrice();
            $globalMonthlyCostOfCredit = $costOfCredit * $monthlyCreditConsumption;
            $creditPurchases = $this->creditTransactionRepository->getLastPurchases();
        }
        // if user is not admin or support, we only display the last five deployments of the current organization
        else {
            $lastFiveDeployments = $this->getUser()->getOrganizations()[0] ? $this->deploymentsRepository->getLastFiveEditedDeployments($this->getUser()->getOrganizations()[0]) : null;
            $monthlyCreditConsumption = $this->getUser()->getOrganizations()[0] ? $this->deploymentsRepository->getCurrentMonthlyConsumption($this->getUser()->getOrganizations()[0]) : 0;
            $hourlyCreditConsumption = $monthlyCreditConsumption / 720;
            $remainingCredits = $this->getUser()->getOrganizations()[0] ? $this->getUser()->getOrganizations()[0]->getRemainingCredits() : 0;
            $creditPurchases = $this->getUser()->getOrganizations()[0] ? $this->creditTransactionRepository->getLastPurchases($this->getUser()->getOrganizations()[0]->getId()) : null;
            $globalMonthlyCostOfCredit = $monthlyCreditConsumption;
        }

        // Get the credit transactions of the last 24 hours
        $credits = $this->getUser()->getOrganizations()[0] ? $this->creditTransactionRepository->creditsUsedLast24Hours($this->getUser()->getOrganizations()[0]->getId()) : $this->creditTransactionRepository->creditsUsedLast24Hours();//array(array('creditsUsed' => 0, 'hour' => 0));
        if (empty($credits)) {
            $credits = array(array('creditsUsed' => 0, 'hour' => 0));
        }
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

        $chart->setOptions(['scales' => ['y' => [ 'suggestedMin' => 0, 'suggestedMax' => max($creditsUsed)+0.5, ],], ]);

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

        if (!$is_advanced_user && 'suspended' == $firstOrgStatus) {
            $this->addFlash('notice-xayma-danger', '<b>Inactive subscribtion</b> : Your account subscription has ended. Please add more credits.');
        }
        if (!$is_advanced_user && 'on_debt' == $firstOrgStatus) {
            $this->addFlash('notice-xayma-danger', '<b>Negative balance</b> : You do not have any credit left. Please add more credits to avoid suspension.');
        }
        
        if (!$is_advanced_user && 'low_credit' == $firstOrgStatus) {
            $this->addFlash('notice-xayma-warning', '<b>Low balance</b> : Your credit balance is very low. Please add more credits to avoid suspension..');
        }
        if (!$is_advanced_user && 'no_credit' == $firstOrgStatus) {
            $this->addFlash('notice-xayma-danger', '<b>No credit</b> : You do not have any credit left. Please add more credits to avoid suspension.');
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
        $marketplaceUrl = $this->adminUrlGenerator
            ->setController(ServiceCrudController::class)
            ->setAction('showmarketplace')
            ->generateUrl();

            //dd($marketplaceUrl);

        return [
            MenuItem::linkToDashboard('Dashboard', 'far fa-chart-bar'),
            MenuItem::section('Mes services'),
            MenuItem::linkToCrud('My Deployments', 'fas fa-rocket', Deployments::class),
            MenuItem::linkToUrl('Marketplace', 'fas fa-store', $marketplaceUrl),
            MenuItem::linkToCrud('Customers', 'far fa-building', Organization::class),
            MenuItem::linkToCrud('Addons', 'fas fa-puzzle-piece', AddonsFolder::class),
            MenuItem::section('Settings')->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Credit Transactions', 'fa-solid fa-magnifying-glass-dollar', CreditTransaction::class)->setPermission('ROLE_SUPPORT')
                ->setDefaultSort(['id' => 'DESC']),
            MenuItem::linkToCrud('Services', 'fab fa-docker', Service::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Control nodes', 'fa fa-sitemap', ControlNode::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Users', 'fas fa-users', User::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Advanced settings', 'fas fa-cog', Settings::class)->setPermission('ROLE_ADMIN')
                ->setAction('detail')
                ->setEntityId(1)
        ];
    }

    public function configureUserMenu(UserInterface $user): UserMenu
    {
        $myprofileUrl = $this->adminUrlGenerator
            ->setController(UserCrudController::class)
            ->setAction('detail')
            ->setEntityId($this->getUser()->getId())
            ->generateUrl()
        ;

        return parent::configureUserMenu($user)
            ->setName($user->getFirstName())
            ->displayUserName(true)
            ->addMenuItems([
                MenuItem::linkToUrl('My profile', 'fa fa-id-card', $myprofileUrl),
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
