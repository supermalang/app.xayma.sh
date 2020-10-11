<?php

namespace App\EventSubscriber;

use App\Entity\Deployments;
use App\Entity\Organization;
use App\Entity\User;
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

    public function __construct(UserPasswordEncoderInterface $passwordEncoder, Security $security, HttpClientInterface $client)
    {
        $this->passwordEncoder = $passwordEncoder;
        $this->security = $security;
        $this->client = $client;
    }

    public static function getSubscribedEvents()
    {
        return [
            // Before creating any entity managed by EasyAdmin
            BeforeEntityPersistedEvent::class => [
                ['setDeploymentOrganization', 40],
                ['launchNewDeployment', 35],
                ['setCreatedTime', 30],
                ['setCreatedByUser', 20],
                ['encryptUserPassword', 10],
                ['setSlug', 5],
            ],
            BeforeEntityUpdatedEvent::class => [
                ['setModifiedTime', 20],
                ['setModifiedByUser', 10],
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
            $awxId = $entity->getService()->getAwxId();
            $controlNodeUrl = $entity->getService()->getControleNode()->getAddress()
                .'/api/v2/job_templates/'.$awxId.'/launch/';
            $authToken = $entity->getService()->getControleNode()->getAuthorizationToken();
            $slugger = new AsciiSlugger();
            $instance_slug = strtolower($slugger->slug($entity->getLabel())->toString());
            $organization = strtolower(preg_replace('/\s+/', '', $entity->getOrganization()->getLabel()));
            $version = $entity->getService()->getVersion();

            $headers = ['Content-Type' => 'application/json', 'Authorization' => 'Bearer '.$authToken];

            $domain = str_replace('http://', '', $entity->getDomainName());
            $domain = str_replace('https://', '', $domain);

            $extra_vars = ['organization' => $organization, 'instancename' => $instance_slug, 'domain' => $domain, 'version' => $version];
            $deployment_tags = $entity->getService()->getDeployTags();

            $body = ['extra_vars' => $extra_vars, 'job_tags' => $deployment_tags];

            $response = $this->client->request(
                'POST',
                $controlNodeUrl,
                ['headers' => $headers, 'json' => $body]
            );
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

            $org_folder = '../public/uploads/'.$entity->getSlug();

            // The organization folder or instance subfolder to create
            $folder = $entity instanceof Organization ? $org_folder : $org_folder.'/'.$entity->getSlug();

            /** Created a folder hierarchy so that users can upload addons, using the file manager */
            $fs = new Filesystem();
            if (!$fs->exists($folder)) {
                $fs->mkdir($folder);
            }
        }
    }
}
