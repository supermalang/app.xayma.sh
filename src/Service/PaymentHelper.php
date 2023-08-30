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


    public function checkout($article_name, $article_price, $command_name, $order_ref, $credentials = [], $customFields = []){
        $apiKey = $credentials['api_key'];
        $secretKey = $credentials['secret_key'];
        
        \PayTech\Config::setApiKey($apiKey);
        \PayTech\Config::setApiSecret($secretKey);
        \PayTech\Config::setEnv($_ENV['PAYMENT_ENV']);
        \PayTech\Config::setIpnUrl($_ENV['PAYMENT_IPN_URL']);
        \PayTech\Config::setSuccessUrl($_ENV['PAYMENT_SUCCESS_URL']);
        \PayTech\Config::setCancelUrl($_ENV['PAYMENT_CANCEL_URL']);
        //\PayTech\PayTech::setCustomFields($customFields);

        $order = new \PayTech\Invoice\InvoiceItem($article_name, $article_price, $command_name, $order_ref);
        \PayTech\PayTech::send($order);
        
        return $response = [
            'success'      => \PayTech\ApiResponse::getSuccess(),
            'errors'       => \PayTech\ApiResponse::getErrors(),
            'token'        => \PayTech\ApiResponse::getToken(),
            'redirect_url' => \PayTech\ApiResponse::getRedirectUrl(),
        ];
    }

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
    
}
