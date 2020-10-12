<?php

namespace App\Service;

use App\Entity\ControlNode;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class AwxHelper
{
    const JOB_TEMPLATES = '/api/v2/job_templates';
    const LAUNCH_JOB_TEMPLATE = '/api/v2/job_templates/10/launch/';
    private $httpclient;

    public function __construct(HttpClientInterface $client)
    {
        $this->httpclient = $client;
    }

    public function getJobTemplates(ControlNode $controlNode)
    {
        $authToken = $controlNode->getAuthorizationToken();
        $address = $controlNode->getAddress();
        $endpoint = $address.$this::JOB_TEMPLATES;

        $headers = ['Content-Type' => 'application/json', 'Authorization' => 'Bearer '.$authToken];

        $response = $this->client->request('GET', $endpoint, ['headers' => $headers]);

        $results = $response['results'];

        $jobTemplatesList = [];

        foreach ($results as $result) {
            $jobTemplate_ID = array_map(function ($e) { return is_object($e) ? $e->getId() : $e['id']; }, $result);
            $jobTemplate_name = array_map(function ($e) { return is_object($e) ? $e->getName() : $e['name']; }, $result);

            array_push($jobTemplatesList, ['value' => $jobTemplate_ID, 'label' => $jobTemplate_name]);
        }

        return $jobTemplatesList;
    }
}
