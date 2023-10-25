<?php

namespace App\MessageHandler;

use Symfony\Component\Messenger\Handler\MessageHandlerInterface;
use App\Message\UpdateDeploymentMessage;
use App\Service\Notifier;
use App\Service\AwxHelper;
use App\Repository\DeploymentsRepository;

final class UpdateDeploymentMessageHandler implements MessageHandlerInterface
{
    private $deplRep;
    private $notifier;
    private $orchestrator;

    public function __construct(DeploymentsRepository $deplRep, Notifier $notifier, AwxHelper $orchestrator){
        $this->deplRep = $deplRep;
        $this->notifier = $notifier;
        $this->orchestrator = $orchestrator;
    }

    public function __invoke(UpdateDeploymentMessage $message)
    {
        $deployment = $this->deplRep->find($message->getDeploymentId());
        $job_tags = $message->getDeploymentOperation();

        // Launch the deployment
        $statuscode = $this->orchestrator->updateDeployment($deployment, $job_tags);

        // If status code is not 200, then the deployment failed, we send an email
        if ($statuscode != 200 && $statuscode != 201) {
            $to = $_ENV['ADMIN_EMAIL'] ?? 'admin@localhost';
            $subject = "Your application deployment operation has failed";
            $content = "Your app deployment operation has failed to execute successfully. "
                        ."Deployment ID: ".$deployment->getId()
                        .".\n Instance name: ".$deployment->getSlug()
                        .".\n Service: ".$deployment->getService()->getLabel()
                        .".\n Organization: ".$deployment->getOrganization()->getLabel()
                        .".\n Status code: ".$statuscode
                        .".\n Please check the logs for more information.";

            return $this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
        }

        $to = $deployment->getOrganization()->getEmail();
        $subject = "Your application has just been updated";
        $content = "Your new app deployment has been successfuly updated with the operation '$job_tags'";

        return $this->notifier->sendEmail($_ENV['EMAIL_FROM'], $to, $subject, $content);
    }
}
