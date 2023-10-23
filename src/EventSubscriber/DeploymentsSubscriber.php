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

class DeploymentsSubscriber implements EventSubscriberInterface
{
    private $em;
    private $requestStack;
    private $security;
    private $bus;

    public function __construct(EntityManagerInterface $em, Security $security, RequestStack $requestStack, MessageBusInterface $bus)
    {
        $this->em = $em;
        $this->security = $security;
        $this->requestStack = $requestStack;
        $this->bus = $bus;
    }

    public static function getSubscribedEvents()
    {
        return [
            BeforeEntityPersistedEvent::class =>[
                ['setDeploymentOrganizationAppAndPlan', 100],
            ],
            
            AfterEntityPersistedEvent::class =>[
                ['launchNewDeployment', 90],
            ]
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

    /** Launch a job template in AWX for the provisionning of a new application */
    public function launchNewDeployment(AfterEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Deployments) {
            $this->bus->dispatch(new LaunchDeploymentMessage($entity->getId()));
        }
    }

}
