<?php

namespace App\MessageHandler;

use Symfony\Component\Messenger\Handler\MessageHandlerInterface;
use App\Service\Notifier;
use App\Service\AwxHelper;
use App\Message\LaunchDeploymentMessage;
use App\Repository\DeploymentsRepository;
use App\Repository\ControlNodeRepository;

final class LaunchDeploymentMessageHandler implements MessageHandlerInterface
{
    private $deplRep;
    private $cnRep;
    private $notifier;
    private $orchestrator;

    public function __construct(DeploymentsRepository $deplRep, Notifier $notifier, ControlNodeRepository $cnRep, AwxHelper $orchestrator){
        $this->deplRep = $deplRep;
        $this->cnRep = $cnRep;
        $this->notifier = $notifier;
        $this->orchestrator = $orchestrator;
    }

    public function __invoke(LaunchDeploymentMessage $message)
    {
        $deployment = $this->deplRep->find($message->getDeploymentId());
        $jobTemplateId = $deployment->getService()->getJobTemplateId();
        $controlNode = $this->cnRep->find($deployment->getService()->getControlNode()->getId());

        // Launch the deployment
        $this->orchestrator->launchJobTemplate($controlNode, $jobTemplateId, $deployment);

        $to = $deployment->getOrganization()->getEmail();
        $subject = "Your application has just been deployed";
        $content = "Your new app deployment has been successfuly launched";

        $this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
    }
}
