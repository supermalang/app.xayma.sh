<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\Event;
use Symfony\Component\Workflow\Registry;

class OrganizationSubscriber implements EventSubscriberInterface
{
    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
    }

    public static function getSubscribedEvents(): array
    {
        return [];
        /*return [
            'workflow.manage_organization_status.enter.active' => [
                ['fire_activation', 10],
                ['fire_reactivation', 5], // <-- in case of archival
            ],
            'workflow.manage_organization_status.enter.suspended' => ['fire_suspension'],
            'workflow.manage_organization_status.enter.archived' => ['fire_archival'],
            'workflow.manage_organization_status.enter.pending_deletion' => ['fire_deletion'],
        ];*/
    }

    public function fire_activation(Event $event): void
    {
    }

    public function fire_reactivation(Event $event): void
    {
    }

    public function fire_suspension(Event $event): void
    {
    }

    public function fire_archival(Event $event): void
    {
    }

    public function fire_deletion(Event $event): void
    {
    }
}
