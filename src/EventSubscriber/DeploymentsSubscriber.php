<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\EnteredEvent;
use Symfony\Component\Workflow\Registry;

class DeploymentsSubscriber implements EventSubscriberInterface
{
    private $workflow;
    private $workflowRegistry;
    private $em;

    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
    }

    public static function getSubscribedEvents()
    {
        // Might want to use it for logging any time a deployment leave a state
        return [];
    }

}
