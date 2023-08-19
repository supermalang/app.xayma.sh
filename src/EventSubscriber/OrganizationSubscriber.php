<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\Event;
use Symfony\Component\Workflow\Registry;
use Symfony\Component\Console\Event\ConsoleTerminateEvent;
use App\Repository\OrganizationRepository;


class OrganizationSubscriber implements EventSubscriberInterface
{
    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry, OrganizationRepository $organizationRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->organizationRepository = $organizationRepository;
    }

    public static function getSubscribedEvents(): array
    {
        return [
               'console.terminate' => 'onConsoleTerminate',
               ];
    }

    /**
     * Check whether the 'app:update-remaining-credits' command is executed in the console
     * 
     * @param Event $event
     */
    public function onConsoleTerminate(ConsoleTerminateEvent $event)
    {
        $command = $event->getCommand()->getName();

        // if the command is 'app:update-remaining-credits' update the organizations status
        if ($command === 'app:update-remaining-credits') {
            $this->batchCheckOrganizationsToDisable();
        }
    }

    /**
     * Check whether the organization will be suspended or not, depending on the remaining credits and the debt permission
     */
    protected function batchCheckOrganizationsToDisable(){
        // get the workflow of the organization. the workflow is manage_organization_status
        $workflow = $this->workflowRegistry->get(new \App\Entity\Organization(), 'manage_organization_status');

        // get all organizations that have 0 credits remaining and for which allowCreditDebt if false
        $orgs_with_no_credits = $this->organizationRepository->findAllExpiredWithoutCreditDebts();

        // get all organizations that have 0 remainingCredits and can have a credit debt
        $orgs_with_credit_debts = $this->organizationRepository->findAllExpiredWithCreditDebts();

        // for each organization with no credit, disable it
        foreach ($orgs_with_no_credits as $organization) {
            if ($workflow->can($organization, 'suspend_subscription')) {
                $workflow->apply($organization, 'suspend_subscription');
            }
        }

        // for each organization with credit debt, if debt is more than 75 credits, disable it
        foreach ($orgs_with_credit_debts as $organization) {
            if ($organization->getRemainingCredits() <= -75) {
                if ($workflow->can($organization, 'suspend_from_debt')) {
                    $workflow->apply($organization, 'suspend_from_debt');
                }
            }
        }

        $this->em->flush();
    }

}
