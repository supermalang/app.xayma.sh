<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Workflow\Event\Event;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;
use Symfony\Component\Workflow\Registry;
use App\Controller\Admin\CreditTransactionCrudController;
use App\Repository\DeploymentsRepository;
use App\Repository\SettingsRepository;
use App\Service\PaymentHelper;
use App\Service\Notifier;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;

class OrgStatusSubscriber implements EventSubscriberInterface
{
    const SYSTEM_SETTINGS_ID = 1;

    private $workflowRegistry;
    private $em;
    private $notifier;
    private $deploymentsRepository;
    private $settingsRepository;
    private $adminUrlGenerator;
    private $paymentHelper;

    public function __construct(
        AdminUrlGenerator $adminUrlGenerator, 
        EntityManagerInterface $em, 
        Registry $workflowRegistry, 
        Notifier $notifier, 
        DeploymentsRepository $deploymentsRepository, 
        SettingsRepository $settingsRepository,
        PaymentHelper $paymentHelper,
        )
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->notifier = $notifier;
        $this->deploymentsRepository = $deploymentsRepository;
        $this->settingsRepository = $settingsRepository;
        $this->paymentHelper = $paymentHelper;
        $this->adminUrlGenerator = $adminUrlGenerator;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            Events::preUpdate => 'preUpdate',               // Doctrine event
            'BeforeEntityPersistedEvent' => 'preUpdate',    // EasyAdmin event
            'workflow.manage_organization_status.entered.active' => [ // active
                ['unsuspendDeployments', 8],
                //['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.active' => [
                ['unsuspendDeployments', 8],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.low_credit' => [ // low credit
                ['unsuspendDeployments', 8],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.low_credit' => [
                ['unsuspendDeployments', 8],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.no_credit' => [ // No credit
                ['suspendOrAllowDebt', 8],                  // Quickly assess if we need to suspend or allow debt
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.no_credit' => [
                ['suspendOrAllowDebt', 8],                  
                //['notifyOrgStatus',9], We do not want to notify as it will happen when the account is suspended
            ],
            'workflow.manage_organization_status.entered.on_debt' => [ // On debt
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.on_debt' => [
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.suspended' => [ // Suspended
                ['suspendOrgActiveDeployments',10],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.suspended' => [
                ['suspendOrgActiveDeployments',10],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status_via_staging.entered.staging' => 'updateOrgStatusAfterTransaction',
        ];
    }

    public function preUpdate(LifecycleEventArgs $args): void
    {
        $this->updateOrgStatusAfterTransaction($args);
    }

    /**
     * Suspend all active deployments of an organization
     */
    public function suspendOrgActiveDeployments(Event $event): void
    {
        $organization = $event->getSubject();
        $deployments = $this->deploymentsRepository->findByStatus($organization, 'active');
        $workflow = array_key_exists(0, $deployments) ? $this->workflowRegistry->get($deployments[0]) : null;

        // Loop through all deployments and stop them
        foreach ($deployments as $deployment) {
            if ($workflow->can($deployment, 'suspend')) {
                $workflow->apply($deployment, 'suspend');
            }
        }
    }
    
    /**
     * Safely unsuspend all suspended deployments of an organization
     */
    public function unsuspendDeployments(Event $event): void
    {
        $organization = $event->getSubject();

        // Get deployments of this organization by using the deployment repository
        // We do not want to start deployments that were stopped by the user
        $deployments = $this->deploymentsRepository->findByStatus($organization, 'suspended');

        $workflow = array_key_exists(0, $deployments) ? $this->workflowRegistry->get($deployments[0]) : null;

        foreach ($deployments as $deployment) {
            if ($workflow->can($deployment, 'start')) {
                $workflow->apply($deployment, 'start');
            }
        }
    }

    /** 
     * Update the status of the organization after a credit transaction 
     */
    public function updateOrgStatusAfterTransaction($event): void
    {
        // If it is a workflow event
        if ($event instanceof Event) {
            $organization = $event->getSubject();
        } 
        // If it is a doctrine event
        elseif ($event instanceof LifecycleEventArgs) {
            $organization = $event->getObject();
        }
        // If it is an easyadmin event
        elseif ($event instanceof BeforeEntityPersistedEvent) {
            $organization = $event->getEntityInstance();
        }
        else{
            // TODO: Log error
            return ;
        }

        $orgRemainingCredit = $organization->getRemainingCredits();
        $lowCreditThreshold = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getLowCreditThreshold();
        $MaxCreditsDebt = (-1 * $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getMaxCreditsDebt());

        $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status_via_staging');

        // Org cannot run anymore cause its debt is too big
        if($orgRemainingCredit <= $MaxCreditsDebt) {
            if ($workflow->can($organization, 'suspend')) {
                $workflow->apply($organization, 'suspend');
            }
        } 
        // Org has no credit
        elseif ($orgRemainingCredit <= 0) {
            // We want to make sure orgs that are suspended because of no credit 
            // are not reactivated until they have a positive balance
            if(in_array('suspended', $event->getTransition()->getFroms())){
                if($workflow->can($organization, 'suspend')){
                    $workflow->apply($organization, 'suspend');
                }
            }
            elseif($workflow->can($organization, 'go_to_nocredit')) {
                $workflow->apply($organization, 'go_to_nocredit');
            }
        } 
        // Org is on Low credit
        elseif ($orgRemainingCredit <= $lowCreditThreshold && $orgRemainingCredit > 0) {            
            if ($workflow->can($organization, 'go_to_lowcredit')) {
                $workflow->apply($organization, 'go_to_lowcredit');
            }
        }
        // Org has enough credit
        else{
            if ($workflow->can($organization, 'activate')) {
                $workflow->apply($organization, 'activate');
            }
        }
        
        $this->em->persist($organization);
    }

    /**
     * Suspend or allow debt for an organization as soon as it has no credit left
     */
    public function suspendOrAllowDebt(Event $event): void{
        $organization = $event->getSubject();
        $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status');

        if($organization->isAllowCreditDebt()){
            if ($workflow->can($organization, 'allow_credit_debt')) {
                $workflow->apply($organization, 'allow_credit_debt');
            }
            if ($workflow->can($organization, 'go_to_debt')) {
                $workflow->apply($organization, 'go_to_debt');
            }
        }else{
            if ($workflow->can($organization, 'suspend')) {
                $workflow->apply($organization, 'suspend');
            }
        }
    }

    public function notifyOrgStatus(Event $event): void{
        $organization = $event->getSubject();

        $creditOption1 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10];
        $creditOption2 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70];
        $creditOption3 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150];
        
        $appUrl = $_ENV['APP_URL'] ?? 'http://localhost';
        $buyCreditsUrl = $appUrl.$this->adminUrlGenerator->setController(CreditTransactionCrudController::class)->setAction('priceoptions')->generateUrl();

        $to = $organization->getEmail();

        $subject = "Organization Status Update";
        
        $transition = $event->getTransition()->getTos();

        if(in_array('active', $transition)){
            $title = "🟢 Your account has been reactivated";
            $message = "Your account has been reactivated successfully. You can now deploy your applications.";
        }
        if(in_array('low_credit', $transition)){
            $title = "⚠️ Your credit balance is very low";
            $message = "Your credit balance is very low. Please buy more credits to avoid suspension.";
        }
        if(in_array('no_credit', $transition)){
            $title = "⚠️ Your credit balance is finished";
            $message = "Your credit balance is finished. Please buy more credits to avoid suspension.";
        }
        if(in_array('on_debt', $transition)){
            $title = "⚠️ Your account is on debt";
            $message = "Your account is on debt, you have no credit left. Please buy more credits to avoid suspension.";
        }
        if(in_array('suspended', $transition)){
            $title = "🛑 Your account has been suspended";
            $message = "Your account has been suspended because you have no credit left. Please buy more credits to reactivate your account.";
        }

        $content = [
            'title' => $title,
            'message' => $message,
            'organization' => $organization,
            'buyCreditPageUrl' => $buyCreditsUrl,
            'creditOptions' => [$creditOption1, $creditOption2, $creditOption3],
        ];        

        $this->notifier->sendOrgStatusUpdateEmail($to, $subject, $content);
    }

}
