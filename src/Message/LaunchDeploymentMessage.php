<?php

namespace App\Message;

final class LaunchDeploymentMessage
{
    private $deploymentId;

    public function __construct(int $deploymentId)
    {
        $this->deploymentId = $deploymentId;
    }

    public function getDeploymentId(): int
    {
        return $this->deploymentId;
    }
}
