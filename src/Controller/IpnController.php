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

    //  a POST route is required to receive the IPN. The Url should contain the credit transaction id
    #[Route('/ipn/{id}', name: 'app_ipn', methods: ['POST'], requirements: ['id' => '\d+'])]
    // Receives and IPN through a POST request
    public function index($id): Response
    {
        $ipnData = json_decode(file_get_contents('php://input'), true) ?? null;
        
        // Check the IPN posted data is of Json type and properly formated
        if ($ipnData === null || json_last_error() !== JSON_ERROR_NONE) {
            return new Response("Received data is not of Json type or not properly formated", 400);
        }
        else{
            // Check the IPN posted data comes from the payment system
            if( $this->paymentHelper->isIpnRequestAuthorized($ipnData) ){
                $this->paymentHelper->processIpn($id, $ipnData);

                return new Response("Payment request received and processed successfully.", 200);
            }
            else{
                var_dump(json_decode($ipnData, true));
                return new Response('Unauthorized', 401);
            }
        }
    }
}
