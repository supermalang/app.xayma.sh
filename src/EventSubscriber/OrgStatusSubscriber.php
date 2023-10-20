<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\Event;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Registry;
use App\Service\AwxHelper;
use App\Repository\DeploymentsRepository;
use App\Repository\SettingsRepository;

class OrgStatusSubscriber implements EventSubscriberInterface
{
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry, AwxHelper $awxHelper, DeploymentsRepository $deploymentsRepository, SettingsRepository $settingsRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->awxHelper = $awxHelper;
        $this->deploymentsRepository = $deploymentsRepository;
        $this->settingsRepository = $settingsRepository;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            'workflow.manage_organization_status.entered.suspended' => 'start_orgSuspension',
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
            $job_tags = $deployment->getService()->getStopTags();
            $job_tags_ = is_array($job_tags) ? implode(', ', $job_tags) : $job_tags;

            $this->awxHelper->updateDeployment($deployment, $job_tags_);
        }
    }

    /** 
     * Update the status of the organization after a credit transaction 
     * Here we do not consider the current status of the org, we rather check the remaining credits
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
}
