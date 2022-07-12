<?php

namespace App\Controller\Admin;

use App\Entity\AddonsFolder;
use App\Entity\ControlNode;
use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\Service;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\UserMenu;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\User\UserInterface;

class DashboardController extends AbstractDashboardController
{
    private $adminUrlGenerator;

    public function __construct(AdminUrlGenerator $adminUrlGenerator)
    {
        $this->adminUrlGenerator = $adminUrlGenerator;
    }

    /**
     * @Route("/", name="admin")
     */
    public function index(): Response
    {
        // Deprecated
        // $routeBuilder = $this->get(AdminUrlGenerator::class)->build();
        $routeBuilder = $this->adminUrlGenerator;

        return $this->redirect($routeBuilder->setController(DeploymentsCrudController::class)->generateUrl());
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('<img src="/img/logo.png" style="width:32px;"> Xayma.sh')
            ->generateRelativeUrls()
            ->disableDarkMode()
            ->setFaviconPath('/favicon.png')
        ;
    }

    public function configureMenuItems(): iterable
    {
        return [
            MenuItem::linkToDashboard('Dashboard', 'far fa-chart-bar'),
            MenuItem::section('Mes services'),
            MenuItem::linkToCrud('Applications', 'fas fa-rocket', Deployments::class),
            MenuItem::linkToCrud('Customers', 'far fa-building', Organization::class),
            MenuItem::linkToCrud('Addons', 'fas fa-puzzle-piece', AddonsFolder::class),
            MenuItem::section('Parametres')->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Services', 'fab fa-docker', Service::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Noeuds de Controle', 'fa fa-sitemap', ControlNode::class)->setPermission('ROLE_SUPPORT'),
            MenuItem::linkToCrud('Utilisateurs', 'fas fa-users', User::class)->setPermission('ROLE_SUPPORT'),
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
