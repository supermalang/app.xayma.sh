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
        $controlNode = $this->cnRep->find($deployment->getService()->getControleNode()->getId());

        // Launch the deployment
        $statuscode = $this->orchestrator->launchJobTemplate($controlNode, $jobTemplateId, $deployment);

        // If status code is not 200, then the deployment failed, we send an email
        if ($statuscode != 200 && $statuscode != 201) {
            $to = $_ENV['ADMIN_EMAIL'] ?? 'admin@localhost';
            $subject = "Your application deployment has failed";
            $content = "Your new app deployment has failed to launch. "
                        ."Deployment ID: ".$deployment->getId()
                        .".\n Instance name: ".$deployment->getSlug()
                        .".\n Service: ".$deployment->getService()->getLabel()
                        .".\n Organization: ".$deployment->getOrganization()->getLabel()
                        .".\n Status code: ".$statuscode
                        .".\n Please check the logs for more information.";

            //return $this->notifier->sendFailedDeploymentEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
        }

        // $to = $deployment->getOrganization()->getEmail();
        // $subject = "Your application has just been deployed";
        // $content = "Your new app deployment has been successfuly launched";

        //return $this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
        return ;
    }
}
