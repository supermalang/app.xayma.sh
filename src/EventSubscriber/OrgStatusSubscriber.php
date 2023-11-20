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
            Events::preUpdate => 'preUpdate',
            'BeforeEntityPersistedEvent' => 'preUpdate',
            'workflow.manage_organization_status.entered.suspended' => [
                ['start_orgSuspension',10],
                ['notifyOrgStatus',9],
                //['unsuspendDeployments', 8],
            ],
            'workflow.manage_organization_status.entered.on_debt' => [
                ['unsuspendDeployments', 8],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.low_credit' => [
                ['unsuspendDeployments', 8],
                ['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.active' => [
                ['unsuspendDeployments', 8],
                //['notifyOrgStatus',9],
            ],
            'workflow.manage_organization_status.entered.staging' => 'updateOrgStatusAfterTransaction',
        ];
    }

    public function preUpdate(LifecycleEventArgs $args): void
    {
        $this->updateOrgStatusAfterTransaction($args);
    }

    public function start_orgSuspension(Event $event): void
    {
        $org = $event->getSubject();
        $orgId = $org->getId();

        $deployments = $this->deploymentsRepository->findBy(['organization' => $orgId]);

        $workflow = array_key_exists(0, $deployments) ? $this->workflowRegistry->get($deployments[0]) : null;

        // Loop through all deployments and stop them
        foreach ($deployments as $deployment) {
            if ($workflow->can($deployment, 'suspend')) {
                $workflow->apply($deployment, 'suspend');
            }
        }
    }
    
    /**
     * Safely unsuspend all active deployments of an organization
     */
    public function unsuspendDeployments(Event $event): void
    {
        $org = $event->getSubject();
        $orgId = $org->getId();

        // Get all deployments for this organization by using the deployment repository
        $deployments = $this->deploymentsRepository->findBy(['organization' => $orgId]);

        // If the org status was `staging` we update its deployments deployment
        if (in_array('staging', $event->getTransition()->getFroms())) {
            
            $workflow = array_key_exists(0, $deployments) ? $this->workflowRegistry->get($deployments[0]) : null;

            foreach ($deployments as $deployment) {
                // We do not want to start deployments that were stopped by the user
                if ($workflow->can($deployment, 'start') && $deployment->getStatus() == 'suspended') {
                    $workflow->apply($deployment, 'start');
                }
            }
        }
    }

    /** 
     * Update the status of the organization after a credit transaction 
     * Here we might not consider the current status of the org for some cases.
     * Those situations happen when the org is on debt or suspended and the admin add a big amount of credit to the org.
     * So the org should be reactivated or taken out of debt. And in such situations, we might need to skip states.
     * Ex: instead of going back from on_debt to low_credit, we might need to go directly to active.
     * and vice versa.
     * Just to avoid having too much states and transitions
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
        // If it is an easyadmin
        elseif ($event instanceof BeforeEntityPersistedEvent) {
            $organization = $event->getEntityInstance();
        }
        else{
            return ;
        }

        $orgRemainingCredit = $organization->getRemainingCredits();
        $lowCreditThreshold = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getLowCreditThreshold();
        $MaxCreditsDebt = (-1 * $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getMaxCreditsDebt());

        $workflow = $this->workflowRegistry->get($organization);

        // Org cannot run anymore cause its debt is too big
        if($orgRemainingCredit <= $MaxCreditsDebt) {
            if ($workflow->can($organization, 'suspend')) {
                $workflow->apply($organization, 'suspend');
            }
        } 
        // Org has no credit
        elseif ($orgRemainingCredit <= 0) {
            if($orgRemainingCredit == 0){
                // We need to make sure customers that were suspended because of no credit are reactivated only if they have a positive balance
                if ($workflow->can($organization, 'go_to_nocredit') && !in_array('suspended', $event->getTransition()->getFroms())) {
                    $workflow->apply($organization, 'go_to_nocredit');
                }
            }
            elseif( $organization->isAllowCreditDebt()){
                // can have debt
                // We need to make sure customers that were suspended because of no credit are reactivated only if they have a positive balance
                if ($workflow->can($organization, 'go_to_debt') && !in_array('suspended', $event->getTransition()->getFroms())) {
                    $workflow->apply($organization, 'go_to_debt');
                }
            }
            else{
                // cannot have debt
                if ($workflow->can($organization, 'suspend')) {
                    $workflow->apply($organization, 'suspend');
                }
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

    public function notifyOrgStatus(Event $event): void{
        $organization = $event->getSubject();

        $creditOption1 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10];
        $creditOption2 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70];
        $creditOption3 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150];

        $buyCreditsUrl = $this->adminUrlGenerator->setController(CreditTransactionCrudController::class)->setAction('priceoptions')->generateUrl();

        $to = $organization->getEmail();

        $subject = "Organization Status Update";
        
        $transition = $event->getTransition()->getTos();

        if(in_array('suspended', $transition)){
            $title = "Your account has been suspended 🛑";
            $message = "Your account has been suspended because you have no credit left. Please buy more credits to reactivate your account.";
        }
        if(in_array('on_debt', $transition)){
            $title = "Your account is on debt ⚠️";
            $message = "Your account is on debt, you have no credit left. Please buy more credits to avoid suspension.";
        }
        if(in_array('low_credit', $transition)){
            $title = "Your credit balance is very low ⚠️";
            $message = "Your credit balance is very low. Please buy more credits to avoid suspension.";
        }
        if(in_array('active', $transition)){
            $title = "Your account has been reactivated 🟢";
            $message = "Your account has been reactivated successfully. You can now deploy your applications.";
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
