<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Workflow\Event\Event;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Registry;
use App\Controller\Admin\CreditTransactionCrudController;
use App\Repository\DeploymentsRepository;
use App\Repository\SettingsRepository;
use App\Service\PaymentHelper;
use App\Service\Notifier;


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
            'workflow.manage_organization_status.entered.suspended' => [
                ['start_orgSuspension',10],
                ['notifySuspension',9]
            ],
            'workflow.manage_organization_status.entered.on_debt' => [
                ['notifyOnDebt',9]
            ],
            'workflow.manage_organization_status.entered.low_credit' => [
                ['notifyLowCredit',9]
            ],
            'workflow.manage_organization_status.entered.active' => [
                ['notifyReactivation',9]
            ],
            'workflow.manage_organization_status.entered.pending_credit_addition' => 'updateOrgStatusAfterTransaction',
        ];
    }

    public function start_orgSuspension(Event $event): void
    {
        $org = $event->getSubject();
        $orgId = $org->getId();

        // Get all deployments for this organization by using the deployment repository
        $deployments = $this->deploymentsRepository->findBy(['organization' => $orgId]);

        // Loop through all deployments and stop them
        foreach ($deployments as $deployment) {
            $workflow = $this->workflowRegistry->get($deployment);

            if ($workflow->can($deployment, 'cw_stop')) {
                $workflow->apply($deployment, 'cw_stop');
            }
        }
    }

    /** 
     * Update the status of the organization after a credit transaction 
     * Here we do not consider the current status of the org, we rather check the remaining credits
     * So we are not using the workflow Registry
     */
    public function updateOrgStatusAfterTransaction(Event $event): void
    {
        $organization = $event->getSubject();
        $orgRemainingCredit = $organization->getRemainingCredits();
        $lowCreditThreshold = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getLowCreditThreshold();
        $MaxCreditsDebt = (-1 * $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getMaxCreditsDebt());

        // Org cannot run anymore cause its debt is too big
        if($orgRemainingCredit <= $MaxCreditsDebt) {
            $this->em->persist($organization->setStatus('suspended'));
        } 
        // Org has no credit
        elseif ($orgRemainingCredit <= 0) {
            if( $organization->isAllowCreditDebt()){
                // can have debt
                $this->em->persist($organization->setStatus('on_debt'));
            }
            else{
                // cannot have debt
                $this->em->persist($organization->setStatus('suspended'));
            }
        } 
        // Org is on Low credit
        elseif ($orgRemainingCredit <= $lowCreditThreshold && $orgRemainingCredit > 0) {
            $this->em->persist($organization->setStatus('low_credit'));
        } 
        // Org has enough credit
        else{
            $this->em->persist($organization->setStatus('active'));
        }
        
        $this->em->persist($organization);
    }

    public function notifySuspension(Event $event): void{
        $organization = $event->getSubject();
        $to = $organization->getEmail();
        $subject = "Your organization has been suspended";
        $content = "Your organization has been suspended because because you do not have any credit left. Please buy credits to enable.";

        //$this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
    }

    public function notifyOnDebt(Event $event): void{
        $organization = $event->getSubject();
        $to = $organization->getEmail();
        $subject = "Your organization is on negative balance";
        $content = "Your organization has a negative balance of credits. Please buy more credits to avoid suspension";

        //$this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
    }

    public function notifyLowCredit(Event $event): void{
        $organization = $event->getSubject();

        $option1 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION1'] ?? 10];
        $option2 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION2'] ?? 70];
        $option3 = ['price' => $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150), 'creditsAmount' => $_ENV['CREDIT_AMOUNT_OPTION3'] ?? 150];

        $buyCreditsUrl = $this->adminUrlGenerator->setController(CreditTransactionCrudController::class)->setAction('priceoptions')->generateUrl();
        
        $to = $organization->getEmail();
        $subject = "Your account has a low balance of credits";

        $subject = "Application Deployment Status Update";
        $content = [
                    'title' => "Your credit balance is very low",
                    'organization' => $organization,
                    'buyCreditPageUrl' => $buyCreditsUrl,
                    'creditOptions' => [$option1, $option2, $option3],
        ];

        $this->notifier->sendLowCreditsEmail($to, $subject, $content);
    }

    public function notifyReactivation(Event $event): void{
        $organization = $event->getSubject();
        $to = $organization->getEmail();
        $subject = "Your application has been unsuspended";
        $content = "Your organization has just been unsuspended. You can now deploy and manage your apps again";

        //$this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
    }
}
