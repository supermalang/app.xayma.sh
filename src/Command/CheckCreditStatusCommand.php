<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\OrganizationRepository;
use App\Repository\SettingsRepository;
use App\Repository\UserRepository;
use App\Entity\User;
use Symfony\Component\Workflow\Event\Event;
use Symfony\Component\Workflow\Registry;

#[AsCommand(
    name: 'app:check-credit-status',
    description: 'Periodically update the org status based on credit remaining',
)]
class CheckCreditStatusCommand extends Command
{
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(EntityManagerInterface $entityManager, OrganizationRepository $organizationRepository, UserRepository $userRepository, SettingsRepository $settingsRepository, Registry $workflowRegistry)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->entityManager = $entityManager;
        $this->organizationRepository = $organizationRepository;
        $this->userRepository = $userRepository;
        $this->settingsRepository = $settingsRepository;
        parent::__construct();
    }


    protected function configure(): void
    {
        //$this
        //->addOption('periodicity', null, InputOption::VALUE_OPTIONAL, 'Periodicity of the command in seconds', 3600)
        //;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $workflow = $this->workflowRegistry->get(new \App\Entity\Organization(), 'manage_organization_status');
        $organizations = $this->organizationRepository->findAll();

        $lowCreditThreshold = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getLowCreditThreshold();
        $MaxCreditsDebt = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getMaxCreditsDebt();

        $orgsWithLowCredit = $this->organizationRepository->findAllLowCredit($lowCreditThreshold);
        $orgsOnDebt = $this->organizationRepository->findAllOnDebt();
        $orgsWithoutCredit = $this->organizationRepository->findAllWithoutCredit();
        $orgsBeyondMaxDebt = $this->organizationRepository->findAllBeyondMaxDebt($MaxCreditsDebt);
        
        /**
         * Orgs that have low credit
         */
        foreach ($orgsWithLowCredit as $organization) {
            if ($workflow->can($organization, 'consume_credit')) {
                $workflow->apply($organization, 'consume_credit');
                $this->entityManager->flush();
            }
        }

        /**
         * Orgs that have finished their credit
         */
        foreach ($orgsWithoutCredit as $organization) {
            if ($workflow->can($organization, 'consume_low_credit')) {
                $workflow->apply($organization, 'consume_low_credit');
                $this->entityManager->flush();
            }
        }

        /*
        * Orgs that have finished their credit and cannot have debt
        */
        foreach ($orgsWithoutCredit as $organization) {
            if ($workflow->can($organization, 'suspend')) {
                $workflow->apply($organization, 'suspend');
                $this->entityManager->flush();
            }
        }

        /**
         * Orgs that have finished their credit and can have debt
         */
        foreach ($orgsOnDebt as $organization) {
            if ($workflow->can($organization, 'allow_credit_debt')) {
                $workflow->apply($organization, 'allow_credit_debt');
                $this->entityManager->flush();
            }
        }

        /**
         * Orgs that have gone beyond authorized debt credits
         */
        foreach ($orgsBeyondMaxDebt as $organization) {
            if ($workflow->can($organization, 'suspend')) {
                $workflow->apply($organization, 'suspend');
                $this->entityManager->flush();
            }
        }

        $now = new \DateTime();
        $nowFormatted = $now->format('Y-m-d H:i:s');
        $io->success("$nowFormatted: The Organizations statuses have been successfully updated");
        
        return Command::SUCCESS;
    }
}