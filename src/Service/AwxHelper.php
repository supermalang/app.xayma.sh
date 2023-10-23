<?php

namespace App\Service;

use App\Entity\ControlNode;
use App\Entity\Deployments;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class AwxHelper
{
    public const JOB_TEMPLATES = '/api/v2/job_templates';
    public const LAUNCH_JOB_TEMPLATE = '/api/v2/job_templates/#/launch/';
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

        $jobTemplate_IDs = array_map(function ($e) { return is_object($e) ? $e->getId() : $e['id']; }, $results);
        $jobTemplate_names = array_map(function ($e) { return is_object($e) ? $e->getName() : $e['name']; }, $results);

        return array_combine($jobTemplate_IDs, $jobTemplate_names);
    }

    /**
     * Launch a Job Template on a given AWX instance.
     */
    public function launchJobTemplate(ControlNode $controlNode, int $jobTemplateId, Deployments $appInstance)
    {
        $authToken = $controlNode->getAuthorizationToken();
        $address = $controlNode->getAddress();
        $endpoint = $address.str_replace('#', $jobTemplateId, $this::LAUNCH_JOB_TEMPLATE);
        $headers = ['Content-Type' => 'application/json', 'Authorization' => 'Bearer '.$authToken];

        $instance = $appInstance->getSlug();
        $organization = $appInstance->getOrganization()->getSlug();
        $version = $appInstance->getServiceVersion();

        $domain = str_replace('http://', '', $appInstance->getDomainName() ?? '');
        $domain = str_replace('https://', '', $domain);

        $extra_vars = ['organization' => $organization, 'instancename' => $instance, 'domain' => $domain, 'version' => $version];
        $deployment_tags = $appInstance->getService()->getDeployTags();

        $body = ['extra_vars' => $extra_vars, 'job_tags' => $deployment_tags];

        $response = $this->httpclient->request(
            'POST',
            $endpoint,
            ['headers' => $headers, 'json' => $body]
        );

        return $response->getStatusCode();
    }

    /**
     * Update the deployment in AWX.
     * @param Deployments $entity The deployment entity to update
     * @param string $job_tags The tags to use for the deployment. If no tag is given the default stop tags will be used
     */
    public function updateDeployment(Deployments $entity, $job_tags = null): void
    {
        // if job_tags is null, use the default stop tags from the service
        $job_tags = $job_tags ?? $entity->getService()->getStopTags();

        $awxId = $entity->getService()->getAwxId();
        $controlNodeUrl = $entity->getService()->getControleNode()->getAddress()
            .'/api/v2/job_templates/'.$awxId.'/launch/';
        $authToken = $entity->getService()->getControleNode()->getAuthorizationToken();

        $instance_slug = $entity->getSlug();
        $organization = strtolower(preg_replace('/\s+/', '', $entity->getOrganization()->getSlug()));
        $version = $entity->getServiceVersion();

        $headers = ['Content-Type' => 'application/json', 'Authorization' => 'Bearer '.$authToken];

        $domain = str_replace('http://', '', $entity->getDomainName());
        $domain = str_replace('https://', '', $domain);

        $extra_vars = ['organization' => $organization, 'instancename' => $instance_slug, 'domain' => $domain, 'version' => $version];

        $this->httpclient->request(
            'POST',
            $controlNodeUrl,
            ['headers' => $headers, 'json' => ['extra_vars' => $extra_vars, 'job_tags' => $job_tags]]
        );
    }
}
