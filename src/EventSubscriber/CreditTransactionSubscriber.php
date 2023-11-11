<?php

namespace App\EventSubscriber;

use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Event\Event;
use Symfony\Component\Workflow\Registry;
use App\Entity\CreditTransaction;
use App\Entity\Organization;
use App\Repository\SettingsRepository;


class CreditTransactionSubscriber implements EventSubscriberInterface
{
    const SYSTEM_SETTINGS_ID = 1;

    private $workflowRegistry;
    private $em;
    private $settingsRepository;
    
    public function __construct(EntityManagerInterface $entityManager, Registry $workflowRegistry, SettingsRepository $settingsRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $entityManager;
        $this->settingsRepository = $settingsRepository;
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
    public function newAdminCreditTransaction(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();
        
        if ($entity instanceof CreditTransaction) {
            $organizationId = $entity->getOrganization()->getId();
            $organization = $this->em->getRepository(Organization::class)->find($organizationId);
            $transactiontype = $entity->getTransactionType();

            $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status');
            $workflow_add_credit_operations = ['suspended_add_credit', 'ondebt_add_credit', 'nocredit_add_credit', 'lowcredit_add_credit'];

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

            foreach($workflow_add_credit_operations as $operation){
                if($workflow->can($organization, $operation)){
                    $workflow->apply($organization, $operation);
                    $this->em->persist($organization);
                    break;
                }
            }
            
            $this->em->persist($organization);
        }
    }
}
