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
use App\Entity\User;
use App\Entity\Settings;

#[AsCommand(
    name: 'app:create-initial-data',
    description: 'Add initial data like system user and settings',
)]
class CreateInitialDataCommand extends Command
{
    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
        parent::__construct();
    }

    protected function configure(): void
    {
        return ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        
        $user = new User();
        $user->setEmail('admin');
        $user->setPassword('$2y$13$3ejjFXqC5.IXuk35/p1G/e5CLwv.2B/eQhD8r2cjyKaboILE.1VOG'); // admin
        $user->setRoles(['ROLE_ADMIN']);
        $user->setFirstName('System');
        $user->setLastName('User');

        $settings = new Settings();
        $settings->setMaxDaysToArchiveDepl(30);
        $settings->setMaxDaysToDeleteDepl(90);
        $settings->setMaxDaysToArchiveOrgs(180);
        $settings->setMaxDaysToDeleteOrgs(365);
        $settings->setLowCreditThreshold(5);
        $settings->setMaxCreditsDebt(10);
        $settings->setCreditPrice(400);
        $settings->setCreatedBy($user);
        $settings->setPaymentApiKey('n/a');
        $settings->setPaymentSecretKey('n/a');
        $settings->setPaymentSuccessUrl($_ENV['PAYMENT_SUCCESS_URL']);
        $settings->setPaymentCancelUrl($_ENV['PAYMENT_CANCEL_URL']);
        $settings->setPaymentIpnUrl($_ENV['PAYMENT_IPN_URL']);

        $this->em->persist($settings);
        $this->em->persist($user);
        $this->em->flush();

        // creates a variable that contains the current date and time
        $now = new \DateTime();
        $nowFormatted = $now->format('Y-m-d H:i:s');
        $io->success("$nowFormatted : Your initial data has bee successfully added");

        return Command::SUCCESS;
    }
}
