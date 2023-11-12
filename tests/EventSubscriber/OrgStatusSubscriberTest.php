<?php

namespace App\Tests\EventSubscriber;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use App\EventSubscriber\OrgStatusSubscriber;
use App\Entity\Organization;
use Doctrine\Persistence\Event\LifecycleEventArgs;
use App\Entity\Settings;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Workflow\Registry;
use App\Service\Notifier;
use App\Service\PaymentHelper;
use App\Repository\DeploymentsRepository;
use App\Repository\SettingsRepository;


class OrgStatusSubscriberTest extends KernelTestCase
{
    public function orgCreditStatusProvider(): \Generator
    {
        $max_credit_debt = $_ENV['MAX_CREDITS_DEBT'] ?? 10;
        $low_credit_threshold = $_ENV['LOW_CREDIT_THRESHOLD'] ?? 5;

        yield [$low_credit_threshold + $low_credit_threshold, 'active'];
        yield [$low_credit_threshold - 2, 'low_credit'];
        yield [$low_credit_threshold - 1, 'low_credit'];
        yield [$low_credit_threshold - $low_credit_threshold, 'no_credit'];
        yield [$low_credit_threshold - $low_credit_threshold - 1, 'on_debt'];
        yield [(-1 * $max_credit_debt), 'suspended'];
        yield [(-1 * $max_credit_debt) - 20, 'suspended'];
    }

    public function testOrgHasDoctrineEvents(): void
    {
        $this->assertArrayHasKey('preUpdate', OrgStatusSubscriber::getSubscribedEvents());
    }

    
    /**
     * @dataProvider orgCreditStatusProvider
     */
    public function testOrgStatusIsProperlyUpdatedAfterTransaction(int $remainingCredits, string $expectedStatus): void
    {
        $max_credit_debt = $_ENV['MAX_CREDITS_DEBT'] ?? 10;
        $low_credit_threshold = $_ENV['LOW_CREDIT_THRESHOLD'] ?? 5;
        $debt_allowed = $_ENV['DEBT_ALLOWED'] ?? true;

        self::bootKernel();
        $container = static::getContainer();
        
        /**
         * Create a settings entity and use that settings entity to mock the settings repository
         * in a way to return the settings entity when the find method is called
         */
        $settingsEntity = new Settings();
        $settingsEntity->setLowCreditThreshold($low_credit_threshold);
        $settingsEntity->setMaxCreditsDebt($max_credit_debt);
        
        $settingsRepository = $this->createMock(SettingsRepository::class);
        $settingsRepository->expects($this->any())
            ->method('find')
            ->with($this->equalTo(1))
            ->willReturn($settingsEntity);
        
        
        /**
         * Create a mock organization entity and set the initial status
         */
        $organization = new Organization();
        $organization->setStatus('staging');
        $organization->setRemainingCredits($remainingCredits);
        $organization->setAllowCreditDebt($debt_allowed);

        /**
         * Services that will be injected in the constructor of OrgStatusSubscriber
         * adminUrlGenerator cannot be mocked as it is a final class
         */
        $adminUrlGenerator = $container->get(AdminUrlGenerator::class);
        $workflowRegistry = $container->get(Registry::class);
        $em = $this->createMock(EntityManagerInterface::class);
        $notifier = $this->createMock(Notifier::class);
        $deploymentsRepository = $this->createMock(DeploymentsRepository::class);
        $paymentHelper = $this->createMock(PaymentHelper::class);

        $subscriber = new OrgStatusSubscriber(
            $adminUrlGenerator,
            $em,
            $workflowRegistry,
            $notifier,
            $deploymentsRepository,
            $settingsRepository,
            $paymentHelper
        );

        /**
         * Create a mock LifecycleEventArgs and call the preUpdate method of OrgStatusSubscriber
         */
        $eventArgs = $this->createMock(LifecycleEventArgs::class);
        $eventArgs->expects($this->once())
            ->method('getObject')
            ->willReturn($organization);

        $subscriber->preUpdate($eventArgs);

        $this->assertEquals($expectedStatus, $organization->getStatus(), "we got `".$organization->getStatus()."` instead of ".$expectedStatus);
    }
}