<?php

namespace App\Service;

use App\Repository\SettingsRepository;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\CreditTransactionRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Workflow\Registry;


class PaymentHelper
{
    const SYSTEM_SETTINGS_ID = 1;
    
    private $settingsRepository; 
    private $em;
    private $creditTransactionRepository;
    private $workflowRegistry;


    public function __construct(SettingsRepository $settingsRepository, EntityManagerInterface $em, CreditTransactionRepository $creditTransactionRepository, Registry $workflowRegistry)
    {
        $this->settingsRepository = $settingsRepository; 
        $this->em = $em;
        $this->creditTransactionRepository = $creditTransactionRepository;
        $this->workflowRegistry = $workflowRegistry;
    }

    /**
     * Create a new credit transaction and checkout the order using the payment provider
     * @param string $article_name The name of the article the customer is buying
     * @param int $article_price The amount the customer pays
     * @param string $command_name The command label
     * @param string $order_ref The order reference
     * @param int $creditTransactionId The id of the credit transaction
     * @return array
     */
    public function checkout($article_name, $article_price, $command_name, $order_ref, $creditTransactionId): array{
        $apiKey = $this->getApiKey();
        $secretKey = $this->getSecretKey();
        
        $ipnUrl = $this->getIpnUrl() ?? $_ENV['PAYMENT_IPN_URL'] ?? null;
        $ipnUrl = str_replace('{#}', $creditTransactionId, $ipnUrl);

        $customFields = [
            'creditTransactionId' => $creditTransactionId,
        ];

        $priceWithoutTransactionFee = floor($article_price / (1 + $_ENV['PAYMENT_FEE_RATE']));

        \PayTech\Config::setApiKey($apiKey);
        \PayTech\Config::setApiSecret($secretKey);
        \PayTech\Config::setEnv($_ENV['PAYMENT_ENV'] );
        \PayTech\Config::setIpnUrl($ipnUrl ?? null);
        \PayTech\Config::setSuccessUrl($this->getSuccessUrl() ?? $_ENV['PAYMENT_SUCCESS_URL'] ?? null);
        \PayTech\Config::setCancelUrl($this->getCancelUrl() ?? $_ENV['PAYMENT_CANCEL_URL'] ?? null);
        \PayTech\CustomField::set('creditTransactionId', $creditTransactionId);

        $order = new \PayTech\Invoice\InvoiceItem($article_name, (int)$priceWithoutTransactionFee, $command_name, $order_ref);
        \PayTech\PayTech::send($order);

        return $response = [
            'success'      => \PayTech\ApiResponse::getSuccess(),
            'errors'       => \PayTech\ApiResponse::getErrors(),
            'token'        => \PayTech\ApiResponse::getToken(),
            'redirect_url' => \PayTech\ApiResponse::getRedirectUrl(),
        ];
    }

    /**
     * Get the order amount/total price based on the number of credits purchased, using the different options
     * @param int $creditsAmount
     * @return int
     */
    public function getOrderAmount($creditsAmount){
        $price = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getCreditPrice();

        if($creditsAmount < $_ENV['CREDIT_AMOUNT_OPTION2']){
            $orderAmount =  round($_ENV['OPTION1_COEF'] * $price * $creditsAmount);
        }
        elseif($creditsAmount < $_ENV['CREDIT_AMOUNT_OPTION3']){
            $orderAmount = round($_ENV['OPTION2_COEF'] * $price * $creditsAmount);
        }
        else{
            $orderAmount = round($_ENV['OPTION3_COEF'] * $price * $creditsAmount);
        }

        return (int)$orderAmount;
    }

    public function getApiKey(){
        return $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentApiKey();
    }

    public function getSecretKey(){
        return $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentSecretKey();
    }

    public function getSuccessUrl(){
        return $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentSuccessUrl();
    }

    public function getCancelUrl(){
        return $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentCancelUrl();
    }

    public function getIpnUrl(){
        return $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentIpnUrl();
    }
    
    #
    # We want to make sure the IPN methods are agnostic of the payment provider
    # We will have generic methods that will call the specific methods
    # So in the future, if we decide to change the payment provider, we will only have to change the specific methods called
    #

    /**
     * Check if the IPN is authorized to access the system.
     */
    public function isIpnRequestAuthorized($ipnData){
        return $this->isPaytechIpnRequestAuthorized($ipnData);
    }

    /**
     * Update the transaction status
     */
    public function processIpn($id, $ipnData){
        return $this->processPaytechIpn($id, $ipnData);
    }

    #
    # PAYTECH SPECIFIC FUNCTIONS
    #

    /**
     * Check if the IPN is authorized to access the system
     */
    public function isPaytechIpnRequestAuthorized($ipnData){
        $apiKey = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentApiKey();
        $secretKey = $this->settingsRepository->find(self::SYSTEM_SETTINGS_ID)->getPaymentSecretKey();

        $api_key_sha256 = $ipnData['api_key_sha256'] ?? $ipnData->api_key_sha256 ?? null;
        $api_secret_sha256 = $ipnData['api_secret_sha256'] ?? $ipnData->api_secret_sha256 ?? null;

        if($api_key_sha256 != hash('sha256', $apiKey) || $api_secret_sha256 != hash('sha256', $secretKey)){
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Update the transaction status
     */
    public function processPaytechIpn($id, $ipnData){
        // Get the credit transaction, using its id
        $creditTransaction = $this->creditTransactionRepository->find($id);

        // if the credit transaction is not found, we return an error
        if(!$creditTransaction){
            return new Response("Credit transaction not found", 404);
        }

        // if evenType is sale_canceled, we need to cancel the transaction
        if($ipnData['type_event'] == 'sale_canceled'){
            $creditTransaction->setStatus('failed');
        }
        elseif($ipnData['type_event'] == 'sale_complete'){
            $paymentMethod = $ipnData['payment_method'] ?? null;
            $customerPhone = $ipnData['client_phone'] ?? null;

            $creditTransaction->setPaymentMethod($paymentMethod);
            $creditTransaction->setCustomerPhone($customerPhone);
            $creditTransaction->setStatus('completed');

            $organization = $creditTransaction->getOrganization();

            // get the remaining credits of the organization
            $remainingCredits = $organization->getRemainingCredits();

            // update the remaining credits of the organization
            $organization->setRemainingCredits($remainingCredits + $creditTransaction->getCreditsPurchased());
            $organization->setModified(new \DateTime());
            
            $workflow = $this->workflowRegistry->get($organization, 'manage_organization_status_via_staging');

            if($workflow->can($organization, 'add_transaction')){
                $workflow->apply($organization, 'add_transaction');
            }

            $this->em->persist($organization);
            $this->em->persist($creditTransaction);
            $this->em->flush();
        }
    }
}