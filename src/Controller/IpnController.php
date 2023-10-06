<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\PaymentHelper;

class IpnController extends AbstractController
{   
    public function __construct(PaymentHelper $paymentHelper)
    {
        $this->paymentHelper = $paymentHelper;
    }

    //  a POST route
    #[Route('/ipn', name: 'app_ipn', methods: ['POST', 'GET'])]
    // Receives and IPN through a POST request
    public function index(): Response
    {
        // Get the submitted IPN data
        $ipnData = json_decode(file_get_contents('php://input')) ?? json_encode(file_get_contents('php://input'), true) ?? null;

        // Check the IPN posted data comes from the payment system
        if( $this->paymentHelper->isIpnRequestAuthorized($ipnData) ){
            $this->paymentHelper->processIpn($ipnData);
    
            return new Response("Payment received and processed successfully.", 200);
        }
        else{
            var_dump(json_decode($ipnData, true));
            return new Response('Unauthorized', 401);
        }

    }
}
