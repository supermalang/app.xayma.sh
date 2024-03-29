<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\OrganizationRepository;
use App\Repository\DeploymentsRepository;
use App\Repository\UserRepository;
use App\Entity\CreditTransaction;
use Symfony\Component\Workflow\Registry;
use Psr\Log\LoggerInterface;


#[AsCommand(
    name: 'app:update-remaining-credits',
    description: 'Periodically deduct the credits being used for each organization',
)]
class UpdateRemainingCreditsCommand extends Command
{
    const SYSTEM_USER_ID = 1;
    private $entityManager;
    private $organizationRepository;
    private $deploymentRepository;
    private $userRepository;
    private $logger;
    private $workflowRegistry;


    public function __construct(EntityManagerInterface $entityManager, OrganizationRepository $organizationRepository, DeploymentsRepository $deploymentRepository, UserRepository $userRepository, LoggerInterface $logger, Registry $workflowRegistry)
    {
        $this->entityManager = $entityManager;
        $this->organizationRepository = $organizationRepository;
        $this->deploymentRepository = $deploymentRepository;
        $this->userRepository = $userRepository;
        $this->logger = $logger;
        $this->workflowRegistry = $workflowRegistry;

        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Dry run')
            ->addOption('periodicity', null, InputOption::VALUE_OPTIONAL, 'Periodicity of the command in seconds', 300)
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        /**
         * We only get organizations that are running
         */
        $organizations = $this->organizationRepository->findBy(['status' => ['active', 'low_credit', 'no_credit', 'on_debt']]) ?? [];
        
        /**
         * For each organization, get the sum of credits consumed by each service of the organization during the period of time
         */
        foreach ($organizations as $organization) {
            $monthlyCreditConsumption = $this->deploymentRepository->getCurrentMonthlyConsumption($organization);
            
            // By default the periodicity calculated is one hour
            $periodicityCreditConsumption = $monthlyCreditConsumption / 720;

            // if periodicity is 300 seconds, then divide the hourlyCreditConsumption to get the credits consumed during 5 minutes
            if($input->getOption('periodicity') != 3600){
                $periodicityCreditConsumption = $periodicityCreditConsumption / (3600 / $input->getOption('periodicity'));
            }

            // get the remaining credits of the organization
            $remainingCredits = $organization->getRemainingCredits();

            // update the remaining credits of the organization
            $organization->setRemainingCredits((float)($remainingCredits - $periodicityCreditConsumption));
            $organization->setModified(new \DateTime());

            $creditTransaction = new CreditTransaction();
            $creditTransaction->setOrganization($organization);
            $creditTransaction->setCreditsUsed($periodicityCreditConsumption);
            $creditTransaction->setCreditsRemaining((float)($remainingCredits - $periodicityCreditConsumption));
            $creditTransaction->setTransactionType('debit');
            $creditTransaction->setCreated(new \DateTime());
            $creditTransaction->setCreatedBy($this->userRepository->find(self::SYSTEM_USER_ID));
            $creditTransaction->setStatus('completed');
            $creditTransaction->setOrgCurrentStatus($organization->getStatus());

            if (!$input->getOption('dry-run')) {
                $now = new \DateTime();
                $nowFormatted = $now->format('Y-m-d H:i:s');

                $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status_via_staging');

                if($workflow->can($organization, 'add_transaction')){
                    $workflow->apply($organization, 'add_transaction');
                }

                $this->entityManager->persist($creditTransaction);
                $this->entityManager->persist($organization);
            }
        }
        $this->entityManager->flush();

        // creates a variable that contains the current date and time
        $now = new \DateTime();
        $nowFormatted = $now->format('Y-m-d H:i:s');
        $io->success("$nowFormatted : The credit balance of the organizations have been successfully updated");

        $this->logger->info("$nowFormatted : The credit balance of the organizations have been successfully updated");

        return Command::SUCCESS;
    }
}
