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
    description: 'Add a short description for your command',
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
        $this
        ->addOption('periodicity', null, InputOption::VALUE_OPTIONAL, 'Periodicity of the command in seconds', 3600)
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $workflow = $this->workflowRegistry->get(new \App\Entity\Organization(), 'manage_organization_status');
        $io = new SymfonyStyle($input, $output);
        $organizations = $this->organizationRepository->findAll();

        $lowCreditThreshold = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getLowCreditThreshold();
        $MaxCreditsDebt = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getMaxCreditsDebt();

        foreach ($organizations as $organization) {
            // get the remaining credits of the organization
            $remainingCredits = $organization->getRemainingCredits();

            
            // if the remaining credits are less than the low credit threshold, change the status of the organization to low credit
            if ($remainingCredits < $lowCreditThreshold && $remainingCredits > 0) {
                
                if ($workflow->can($organization, 'consume_credit')) {
                    $workflow->apply($organization, 'consume_credit');
                }
            }
            
            if($remainingCredits <= 0 && !$organization->isAllowCreditDebt()){
                if ($workflow->can($organization, 'consume_low_credit')) {
                    $workflow->apply($organization, 'consume_low_credit');
                }
            }
            
            /**
             * If org can have debts
             */
            if($remainingCredits <= 0 && $organization->isAllowCreditDebt()){
                /** Has gone beyond authorized debt credits */
                if($remainingCredits < (-1 * $MaxCreditsDebt)){
                    if ($workflow->can($organization, 'suspend_from_debt')) {
                        $workflow->apply($organization, 'suspend_from_debt');
                    }
                }
                /** Is within authorized debt credits limits */
                else {
                    if ($workflow->can($organization, 'allow_credit_debt')) {
                        $workflow->apply($organization, 'allow_credit_debt');
                    }
                }
            }
            
            /**
             * If org can't have debts
             */
            if($remainingCredits <= 0 && !$organization->isAllowCreditDebt()){
                if ($workflow->can($organization, 'suspend_subscription')) {
                    $workflow->apply($organization, 'suspend_subscription');
                }
            }
            $this->entityManager->flush();
        }

        $io->success('The Organizations statuses have been updated');
        
        return Command::SUCCESS;
    }

}