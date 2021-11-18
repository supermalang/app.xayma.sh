<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\EnteredEvent;
use Symfony\Component\Workflow\Registry;

class DeploymentsSubscriber implements EventSubscriberInterface
{
    private $workflow;

    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
    }

    public static function getSubscribedEvents()
    {
        return [
            'workflow.manage_app_deployments.entered.stopped' => ['fire_stopApp'],
            'workflow.manage_app_deployments.transition.suspended' => ['fire_suspendApp'],
            'workflow.manage_app_deployments.entered.suspended_by_admin' => ['fire_adminSuspendApp'],
            'workflow.manage_app_deployments.entered.active' => [
                ['fire_startApp', 10],
                ['fire_adminStartApp', 5],
            ],
            'workflow.manage_app_deployments.entered.archived' => [
                ['fire_suspend_to_archiveApp', 20],
                ['fire_admin_suspend_to_archiveApp', 10],
                ['fire_stopped_to_archiveApp', 0],
            ],
        ];
    }

    public function fire_stopApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'stop')) {
            $workflow->apply($event->getSubject(), 'stop');
            $this->em->flush();
        }
    }

    public function fire_suspendApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'suspend')) {
            $workflow->apply($event->getSubject(), 'suspend');
            $this->em->flush();
        }
    }

    public function fire_adminSuspendApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'admin_suspend')) {
            $workflow->apply($event->getSubject(), 'admin_suspend');
            $this->em->flush();
        }
    }

    public function fire_startApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'reactivate')) {
            $workflow->apply($event->getSubject(), 'reactivate');
            $this->em->flush();
        }
    }

    public function fire_adminStartApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'admin_reactivate')) {
            $workflow->apply($event->getSubject(), 'admin_reactivate');
            $this->em->flush();
        }
    }

    public function fire_suspend_to_archiveApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'suspended_to_archive')) {
            $workflow->apply($event->getSubject(), 'suspended_to_archive');
            $this->em->flush();
        }
    }

    public function fire_admin_suspend_to_archiveApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'suspended_by_admin_to_archive')) {
            $workflow->apply($event->getSubject(), 'suspended_by_admin_to_archive');
            $this->em->flush();
        }
    }

    public function fire_stopped_to_archiveApp(EnteredEvent $event)
    {
        $entity = $event->getSubject();
        $workflow = $this->workflowRegistry->get($entity);

        if ($workflow->can($event->getSubject(), 'stopped_to_archive')) {
            $workflow->apply($event->getSubject(), 'stopped_to_archive');
            $this->em->flush();
        }
    }
}
