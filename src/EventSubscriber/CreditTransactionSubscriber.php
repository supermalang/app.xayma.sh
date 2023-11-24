<?php

namespace App\EventSubscriber;

use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Registry;
use App\Entity\CreditTransaction;
use App\Entity\Organization;
use App\Repository\SettingsRepository;
use Psr\Log\LoggerInterface;

class CreditTransactionSubscriber implements EventSubscriberInterface
{
    const SYSTEM_SETTINGS_ID = 1;

    private $workflowRegistry;
    private $em;
    private $logger;
    private $settingsRepository;
    
    public function __construct(EntityManagerInterface $entityManager, Registry $workflowRegistry, SettingsRepository $settingsRepository, LoggerInterface $logger)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $entityManager;
        $this->settingsRepository = $settingsRepository;
        $this->logger = $logger;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            BeforeEntityPersistedEvent::class => [
                ['newAdminCreditTransaction', 10],
            ],
        ];
    }

    /** Add a credit transaction when an admin add a transaction for a customer **/
    public function newAdminCreditTransaction($event)
    {
        // If it is an easyadmin event
        if ($event instanceof BeforeEntityPersistedEvent) {
            $organization = $event->getEntityInstance();
        }

        $entity = $event->getEntityInstance();
        
        if ($entity instanceof CreditTransaction) {
            $organizationId = $entity->getOrganization()->getId();
            $organization = $this->em->getRepository(Organization::class)->find($organizationId);
            $transactiontype = $entity->getTransactionType();

            $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status_via_staging');

            // If transaction type is debit, we need to substract the credits used to the credit of the organization
            if(strtolower($transactiontype) == 'debit'){
                $organization->setRemainingCredits($organization->getRemainingCredits() - $entity->getCreditsUsed());
            }

            // If transaction type is credit, we need to add the credits used to the credit of the organization
            elseif(strtolower($transactiontype) == 'credit'){
                $organization->setRemainingCredits($organization->getRemainingCredits() + $entity->getCreditsPurchased());
            }

            if(strtolower($entity->getStatus()) == 'temporary'){
                $entity->setStatus('completed');
            }

            if($workflow->can($organization, 'add_transaction')){
                $workflow->apply($organization, 'add_transaction');
            }

            $this->em->persist($organization);
        }
    }
}
