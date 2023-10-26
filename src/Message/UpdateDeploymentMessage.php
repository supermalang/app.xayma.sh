<?php

namespace App\Message;

final class UpdateDeploymentMessage
{
    private $deploymentId;
    private $deploymentOperation; 

    public function __construct(int $deploymentId, string $deploymentOperation)
    {
        $this->deploymentId = $deploymentId;
        $this->deploymentOperation = $deploymentOperation;
    }

    public function getDeploymentId(): int
    {
        return $this->deploymentId;
    }

    public function getDeploymentOperation(): string
    {
        return $this->deploymentOperation;
    }
}
