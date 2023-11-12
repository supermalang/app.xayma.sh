<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Workflow\Registry;
use App\Repository\DeploymentsRepository;
use Doctrine\ORM\EntityManagerInterface;


class AppDeploymentLaunchStatusController extends AbstractController
{
    private $workflowRegistry;
    private $deploymentRepository;
    private $em;

    public function __construct(EntityManagerInterface $em, Registry $workflowRegistry, DeploymentsRepository $deploymentRepository)
    {
        $this->workflowRegistry = $workflowRegistry;
        $this->deploymentRepository = $deploymentRepository;
        $this->em = $em;
    }

    #[Route('/appcreationstatus', name: 'app_deployment_launch_status',  methods: ['POST'])]
    public function index(): Response
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $appdeployment = null;

        if ($contentType === 'application/x-www-form-urlencoded') {
            $appdeployment = $_POST ?? null;
        } 
        elseif ($contentType === 'application/json') {
            $appdeployment = json_decode(file_get_contents('php://input'), true) ?? null;
        } 
        else {
            return new Response('Unsupported content type', 400);
        }

        // Check the posted data is of Json type and properly formated
        if ($appdeployment === null || json_last_error() !== JSON_ERROR_NONE) {
            return new Response("Received data content type is not supported or not properly formated", 400);
        }
        else{
            $appdeploymentstatus = $appdeployment['status'];
            $extravars = json_decode($appdeployment['extra_vars'], true);
            $appdeploymentEntity = $this->deploymentRepository->findOneBy(['slug' => $extravars['instancename']]);

            $workflow = $this->workflowRegistry->get($appdeploymentEntity, 'manage_app_deployments');

            if($appdeploymentstatus == 'running'){
                if($workflow->can($appdeploymentEntity, 'deploy')){
                    $workflow->apply($appdeploymentEntity, 'deploy');
                }
            }
            
            if($appdeploymentstatus == 'successful'){
                if($workflow->can($appdeploymentEntity, 'succeed')){
                    $workflow->apply($appdeploymentEntity, 'succeed');
                }
            }

            if($appdeploymentstatus == 'failed'){
                if($workflow->can($appdeploymentEntity, 'fail')){
                    $workflow->apply($appdeploymentEntity, 'fail');
                }
            }

            $this->em->persist($appdeploymentEntity);
            $this->em->flush();

            return new Response('App deployment status updated', 200);
    }
    }
}
