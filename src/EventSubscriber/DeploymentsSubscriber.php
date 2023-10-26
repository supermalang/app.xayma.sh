<?php

namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\HttpFoundation\RequestStack;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityPersistedEvent;
use App\Entity\Deployments;
use App\Entity\Service;
use App\Message\LaunchDeploymentMessage;
use App\Message\UpdateDeploymentMessage;

use Symfony\Component\Workflow\Event\Event;
use App\Repository\ServiceRepository;

class DeploymentsSubscriber implements EventSubscriberInterface
{
    private $em;
    private $requestStack;
    private $security;
    private $bus;
    private $serviceRepository;

    public function __construct(EntityManagerInterface $em, Security $security, RequestStack $requestStack, MessageBusInterface $bus, ServiceRepository $serviceRepository)
    {
        $this->em = $em;
        $this->security = $security;
        $this->requestStack = $requestStack;
        $this->bus = $bus;
        $this->serviceRepository = $serviceRepository;
    }

    public static function getSubscribedEvents()
    {
        return [
            BeforeEntityPersistedEvent::class =>[
                ['setDeploymentOrganizationAppAndPlan', 100],
            ],
            
            //AfterEntityPersistedEvent::class =>[
            //    ['launchNewDeployment', 90],
            //],
            'workflow.manage_app_deployments.entered.active' => 'start_app',
            'workflow.manage_app_deployments.entered.suspended' => 'stop_app',
            'workflow.manage_app_deployments.entered.suspended_by_admin' => 'stop_app',
            'workflow.manage_app_deployments.entered.stopped' => 'stop_app',
            'workflow.manage_app_deployments.entered.stopped_by_creditworker' => 'stop_app',
        ];
    }

    /** Defines the organization that owns the deployment */
    public function setDeploymentOrganizationAppAndPlan(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Deployments) {
            $request = $this->requestStack->getCurrentRequest();
            $deploymentplan = $request->query->get('plan') ?? null;
            $appid = $request->query->get('id') ?? null;

            // Set the organization using the first organization of the user
            if (null == $entity->getOrganization()) {
                $Organizations_array = $this->security->getUser()->getOrganizations()->toArray();
                $entity->setOrganization($Organizations_array[0]);
            }

            // Set the app using the application id parameter/option from the url
            if (null != $appid) {
                $entity->setService($this->em->getRepository(Service::class)->find($appid));
            }


            // Set the deployment plan using the hashed plan parameter/option from the url
            $hashedoptions = [
                'essential' => fn() => (md5('essentialplan') === $deploymentplan),
                'business' => fn() => (md5('businessplan') == $deploymentplan),
                'performance' => fn() => (md5('performanceplan') == $deploymentplan),
            ];

            foreach ($hashedoptions as $plan => $condition) {
                if ($condition()) {
                    $entity->setDeploymentPlan($plan);
                    break;
                }
            }
        }
    }

    /** Launch a job template for the provisionning of a new application */
    public function launchNewDeployment(AfterEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Deployments) {
            $this->bus->dispatch(new LaunchDeploymentMessage($entity->getId()));
        }
    }

    /** Starts the app */
    public function start_app(Event $event)
    {
        $deployment = $event->getSubject();
        
        if ($deployment instanceof Deployments) {
            $service = $this->serviceRepository->find($deployment->getService()->getId());
            $start_tags = $service->getStartTags();
            $job_tags = is_array($start_tags) ? implode(', ', $start_tags) : $start_tags;

            $this->bus->dispatch(new UpdateDeploymentMessage($deployment->getId(), $job_tags));
        }
    }

    /** Stops the app */
    public function stop_app(Event $event)
    {
        $deployment = $event->getSubject();
        
        if ($deployment instanceof Deployments) {
            $service = $this->serviceRepository->find($deployment->getService()->getId());
            $stop_tags = $service->getStopTags();
            $job_tags = is_array($stop_tags) ? implode(', ', $stop_tags) : $stop_tags;

            $this->bus->dispatch(new UpdateDeploymentMessage($deployment->getId(), $job_tags));
        }
    }
}
