<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\Event;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Registry;
use App\Service\AwxHelper;
use App\Repository\DeploymentsRepository;

class OrgStatusSubscriber implements EventSubscriberInterface
{
    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry, AwxHelper $awxHelper, DeploymentsRepository $deploymentsRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->em = $em;
        $this->awxHelper = $awxHelper;
        $this->deploymentsRepository = $deploymentsRepository;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            'workflow.manage_organization_status.entered.suspended' => 'start_orgSuspension',
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
}
