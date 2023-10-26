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
            $subject = "Application Deployment Status Update Failed";
            $content = [
                        'title' => "An app deployment operation has failed to execute successfully",
                        'operations' => $job_tags,
                        'deployment' => $deployment->getLabel().' ('.$deployment->getSlug().')',
                        'organization' => $deployment->getOrganization(),
                        'service' => $deployment->getService().' '.$deployment->getServiceVersion(),
            ];

            return $this->notifier->sendDeploymentUpdateEmail($to, $subject, $content);
        }

        $to = $deployment->getOrganization()->getEmail();
        $subject = "Application Deployment Status Update";
        $content = [
                    'title' => "Your application has just changed status",
                    'operations' => $job_tags,
                    'deployment' => $deployment->getLabel().' ('.$deployment->getSlug().')',
                    'organization' => $deployment->getOrganization(),
                    'service' => $deployment->getService().' '.$deployment->getServiceVersion(),
        ];

        return $this->notifier->sendDeploymentUpdateEmail($to, $subject, $content);
    }
}
