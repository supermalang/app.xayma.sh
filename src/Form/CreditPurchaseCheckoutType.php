<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use App\Service\PaymentHelper;

class CreditPurchaseCheckoutType extends AbstractType
{
    public function __construct(PaymentHelper $paymentHelper)
    {
        $this->paymentHelper = $paymentHelper;
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $option1 = $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION1']);
        $option2 = $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION2']);
        $option3 = $this->paymentHelper->getOrderAmount($_ENV['CREDIT_AMOUNT_OPTION3']);
        
        $builder
        ->add('creditPurchaseOption', ChoiceType::class, [
            'choices' => [
                "$option1" => $_ENV['CREDIT_AMOUNT_OPTION1'],
                "$option2" => $_ENV['CREDIT_AMOUNT_OPTION2'],
                "$option3" => $_ENV['CREDIT_AMOUNT_OPTION3'],
            ],
            'expanded' => true, // Radio buttons instead of a select
            'multiple' => false, // Only one option can be selected
        ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            // Configure your form options here
        ]);
    }
}
