<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Event\ConsoleTerminateEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\Event;
use Symfony\Component\Workflow\Registry;
use App\Repository\OrganizationRepository;
use App\Repository\SettingsRepository;

class CustomCommandsSubscriber implements EventSubscriberInterface
{
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry, OrganizationRepository $organizationRepository, SettingsRepository $settingsRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->organizationRepository = $organizationRepository;
        $this->settingsRepository = $settingsRepository;
    }

    /**
     * Check whether the 'app:update-remaining-credits' command is executed in the console
     * 
     * @param Event $event
     */
    public function onConsoleTerminate(ConsoleTerminateEvent $event): void
    {
        $command = $event->getCommand()->getName();

        // if the command is 'app:update-remaining-credits' update the organizations status
        if ($command === 'app:update-remaining-credits') {
            $this->batchCheckOrgsToDisable();
        }
    }

    public static function getSubscribedEvents(): array
    {
        return [
            'console.terminate' => 'onConsoleTerminate',
        ];
    }

    /**
     * Check whether the organization will be suspended or not, 
     * depending on the remaining credits and the debt permission
     */
    protected function batchCheckOrgsToDisable(){
        $settings = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID);
        
        // get the workflow of the organization. the workflow is manage_organization_status
        $workflow = $this->workflowRegistry->get(new \App\Entity\Organization(), 'manage_organization_status');

        // get all organizations that have 0 credits remaining and for which allowCreditDebt if false
        $orgs_with_no_credits = $this->organizationRepository->findAllWithoutCredit();

        // get all organizations that have 0 remainingCredits and can have a credit debt
        $orgs_with_credit_debts = $this->organizationRepository->findAllOnDebt();

        // get all organizations that have a credit debt and the debt is more than MaxCreditsDebt credits
        $orgsBeyondMaxDebt = $this->organizationRepository->findAllBeyondMaxDebt($settings->getMaxCreditsDebt());

        // for each organization with no credit, disable it
        foreach ($orgs_with_no_credits as $organization) {
            if ($workflow->can($organization, 'suspend_subscription')) {
                $workflow->apply($organization, 'suspend_subscription');
            }
        }

        // for each organization with credit debt beyond the max allowed, disable it
        foreach ($orgsBeyondMaxDebt as $organization) {
            if ($workflow->can($organization, 'suspend_from_debt')) {
                $workflow->apply($organization, 'suspend_from_debt');
            }
        }

        $this->em->flush();
    }
}