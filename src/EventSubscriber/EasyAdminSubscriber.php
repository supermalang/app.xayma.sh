<?php

namespace App\EventSubscriber;

use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\User;
use App\Service\AwxHelper;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityUpdatedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Security;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class EasyAdminSubscriber implements EventSubscriberInterface
{
    private $passwordHasher;
    private $security;
    private $client;
    private $awxHelper;
    private $em;

    public function __construct(UserPasswordHasherInterface $passwordHasher, Security $security, HttpClientInterface $client, AwxHelper $awxHelper, EntityManagerInterface $em)
    {
        $this->passwordHasher = $passwordHasher;
        $this->security = $security;
        $this->client = $client;
        $this->awxHelper = $awxHelper;
        $this->em = $em;
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
            $entity->setPassword($this->passwordHasher->hashPassword($entity, $password));
        }
    }

    /** Set the slug property for the organization or the deployment */
    public function setSlug(BeforeEntityPersistedEvent $event)
    {
        $entity = $event->getEntityInstance();

        if ($entity instanceof Organization or $entity instanceof Deployments) {
            if (null == $entity->getSlug()) {
                $slugger = new AsciiSlugger();

                // We add a prefix on Deployments/Applications to make sure we have a unique slug for each
                // Deprecated: Causes several pain in the automation in Docker side with siphons causing errors
                // $slugPrefix = $entity instanceof Deployments ? $entity->getOrganization()->getSlug().' ' : null;
                // $slugField = strtolower($slugger->slug($slugPrefix.$entity->getLabel()));

                $slugField = strtolower($slugger->slug($entity->getLabel()));

                // Search in the db whether there are already deployment or organization slug field that contains our slug characters
                $slugSearchResults = $entity instanceof Deployments ? $this->em->getRepository(Deployments::class)->searchBySlug($slugField) : $this->em->getRepository(Organization::class)->searchBySlug($slugField);

                // Build the slug suffix number depending on number of results
                $slugSuffix = count($slugSearchResults) > 0 ? '-'.count($slugSearchResults) : null;

                // Add suffix to the slug
                $slugField = strtolower($slugger->slug($slugField.$slugSuffix));

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
