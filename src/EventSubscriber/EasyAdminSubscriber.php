<?php

namespace App\EventSubscriber;

use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\BeforeEntityUpdatedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Core\Encoder\UserPasswordEncoderInterface;
use Symfony\Component\Security\Core\Security;

class EasyAdminSubscriber implements EventSubscriberInterface
{
    private $passwordEncoder;
    private $security;

    public function __construct(UserPasswordEncoderInterface $passwordEncoder, Security $security)
    {
        $this->passwordEncoder = $passwordEncoder;
        $this->security = $security;
    }

    public static function getSubscribedEvents()
    {
        return [
            // Before creating any entity managed by EasyAdmin
            BeforeEntityPersistedEvent::class => [
                ['setCreatedTime', 30],
                ['setCreatedByUser', 20],
                ['encryptUserPassword', 10],
            ],
            BeforeEntityUpdatedEvent::class => [
                ['setModifiedTime', 20],
                ['setModifiedByUser', 10],
            ],
        ];
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
}
