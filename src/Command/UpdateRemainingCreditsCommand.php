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
use App\Repository\DeploymentsRepository;
use App\Repository\UserRepository;
use App\Entity\CreditTransaction;
use App\Entity\User;


#[AsCommand(
    name: 'app:update-remaining-credits',
    description: 'Periodically update the credits remaining for each organization',
)]
class UpdateRemainingCreditsCommand extends Command
{
    const SYSTEM_USER_ID = 1;

    public function __construct(EntityManagerInterface $entityManager, OrganizationRepository $organizationRepository, DeploymentsRepository $deploymentRepository, UserRepository $userRepository)
    {
        $this->entityManager = $entityManager;
        $this->organizationRepository = $organizationRepository;
        $this->deploymentRepository = $deploymentRepository;
        $this->userRepository = $userRepository;
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

        $organizations = $this->organizationRepository->findAll();

        /**
         * For each organization, get the sum of credits consumed by each service of the organization during the period of time
         */
        foreach ($organizations as $organization) {
            $organizationId = $organization->getId();
            $queryBuilder = $this->entityManager->createQueryBuilder();

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
            $organization->setRemainingCredits($remainingCredits - $periodicityCreditConsumption);
            $organization->setModified(new \DateTime());

            // create a new credit transaction
            $creditTransaction = new CreditTransaction();
            $creditTransaction->setOrganization($organization);
            $creditTransaction->setCreditsUsed($periodicityCreditConsumption);
            $creditTransaction->setCreditsRemaining($remainingCredits - $periodicityCreditConsumption);
            $creditTransaction->setTransactionType('debit');
            $creditTransaction->setCreated(new \DateTime());
            $creditTransaction->setCreatedBy($this->userRepository->find(self::SYSTEM_USER_ID));
            $creditTransaction->setStatus('completed');

            // persist if option dry-run is not set
            if (!$input->getOption('dry-run')) {
                $this->entityManager->persist($organization);
                $this->entityManager->persist($creditTransaction);
                $this->entityManager->flush();
            }
            else{
                // Just display the SQL commands that would be run
                // TODO
            }
        }
        // creates a variable that contains the current date and time
        $now = new \DateTime();
        $nowFormatted = $now->format('Y-m-d H:i:s');
        $io->success("$nowFormatted : The credit balance of the organizations have been successfully updated");
      
        return Command::SUCCESS;
    }
}
