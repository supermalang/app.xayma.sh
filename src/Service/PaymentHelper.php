<?php

namespace App\Service;

use App\Repository\SettingsRepository;

class PaymentHelper
{
    const SYSTEM_SETTINGS_ID = 1;

    public function __construct(SettingsRepository $settings)
    {
        $this->settings = $settings; 
    }


    public function checkout($article_name, $article_price, $command_name, $order_ref, $creditTransactionId){
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
     * Get the order amount based on the number of credits purchased, using the different options
     * @param int $creditsAmount
     * @return int
     */
    public function getOrderAmount($creditsAmount){
        // Get the price from the settings
        $price = $this->settings->find(self::SYSTEM_SETTINGS_ID)->getCreditPrice();

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
        return $this->settings->find(self::SYSTEM_SETTINGS_ID)->getPaymentApiKey();
    }

    public function getSecretKey(){
        return $this->settings->find(self::SYSTEM_SETTINGS_ID)->getPaymentSecretKey();
    }

    public function getSuccessUrl(){
        return $this->settings->find(self::SYSTEM_SETTINGS_ID)->getPaymentSuccessUrl();
    }

    public function getCancelUrl(){
        return $this->settings->find(self::SYSTEM_SETTINGS_ID)->getPaymentCancelUrl();
    }

    public function getIpnUrl(){
        return $this->settings->find(self::SYSTEM_SETTINGS_ID)->getPaymentIpnUrl();
    }
}