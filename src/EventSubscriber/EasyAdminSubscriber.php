<?php

namespace App\EventSubscriber;

use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\User;
use App\Service\AwxHelper;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityUpdatedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Security\Core\Encoder\UserPasswordEncoderInterface;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class EasyAdminSubscriber implements EventSubscriberInterface
{
    private $passwordEncoder;
    private $security;
    private $client;
    private $awxHelper;

    public function __construct(UserPasswordEncoderInterface $passwordEncoder, Security $security, HttpClientInterface $client, AwxHelper $awxHelper)
    {
        $this->passwordEncoder = $passwordEncoder;
        $this->security = $security;
        $this->client = $client;
        $this->awxHelper = $awxHelper;
    }

    public static function getSubscribedEvents()
    {
        return [
            // Before creating any entity managed by EasyAdmin
            BeforeEntityPersistedEvent::class => [
                ['setDeploymentOrganization', 40],
                ['setSlug', 35],
                ['launchNewDeployment', 30],
                ['setCreatedTime', 25],
                ['setCreatedByUser', 20],
                ['encryptUserPassword', 15],
            ],
            BeforeEntityUpdatedEvent::class => [
                ['setModifiedTime', 20],
                ['setModifiedByUser', 15],
                ['encryptUserPasswordOnUpdate', 10],
            ],
        ];
    }

    /** Defines the organization that owns the deployment */
    public function setDeploymentOrganization(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Deployments) {
            if (null == $entity->getOrganization()) {
                $Organizations_array = $this->security->getUser()->getOrganizations()->toArray();
                $entity->setOrganization($Organizations_array[0]);
            }
        }
    }

    /** Launch a job template in AWX for the provisionning of a new application */
    public function launchNewDeployment(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Deployments) {
            $controlNode = $entity->getService()->getControleNode();
            $jobTemplId = $entity->getService()->getAwxId();

            $statusCode = $this->awxHelper->launchJobTemplate($controlNode, $jobTemplId, $entity);

            // TODO
            // Launch exceptions when the status code is not 200
        }
    }

    public function setCreatedTime(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if (method_exists($entity, 'setCreated')) {
            $entity->setCreated(new \DateTimeImmutable());
        }
    }

    public function setCreatedByUser(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if (method_exists($entity, 'setCreatedBy')) {
            $entity->setCreatedBy($this->security->getUser());
        }
    }

    public function setModifiedTime(BeforeEntityUpdatedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if (method_exists($entity, 'setModified')) {
            $entity->setModified(new \DateTimeImmutable());
        }
    }

    public function setModifiedByUser(BeforeEntityUpdatedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if (method_exists($entity, 'setModifiedBy')) {
            $entity->setModifiedBy($this->security->getUser());
        }
    }

    public function encryptUserPassword(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof User) {
            $password = $entity->getPassword();
            $entity->setPassword($this->passwordEncoder->encodePassword($entity, $password));
        }
    }

    public function encryptUserPasswordOnUpdate(BeforeEntityUpdatedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof User) {
            $password = $entity->getPassword();
            $entity->setPassword($this->passwordEncoder->encodePassword($entity, $password));
        }
    }

    /** Set the slug property for the organization or the deployment */
    public function setSlug(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Organization or $entity instanceof Deployments) {
            if (null == $entity->getSlug()) {
                $slugger = new AsciiSlugger();
                $slugField = strtolower($slugger->slug($entity->getLabel()));
                $entity->setSlug($slugField);
            }

            $upl_folder = '../public/uploads/';

            // The organization folder or instance subfolder to create
            $folder = $entity instanceof Organization ? $upl_folder.'/'.$entity->getSlug() : $upl_folder.$entity->getOrganization()->getSlug().'/'.$entity->getSlug();

            /** Created a folder hierarchy so that users can upload addons, using the file manager */
            $fs = new Filesystem();
            if (!$fs->exists($folder)) {
                $fs->mkdir($folder);
            }
        }
    }
}
