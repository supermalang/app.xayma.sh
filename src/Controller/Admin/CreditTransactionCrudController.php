<?php

namespace App\Controller\Admin;

use App\Entity\CreditTransaction;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\PaymentHelper;
use App\Form\CreditPurchaseCheckoutType;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;

class CreditTransactionCrudController extends AbstractCrudController
{
    public function __construct(PaymentHelper $paymentHelper, AdminUrlGenerator $adminUrlGenerator)
    {
        $this->paymentHelper = $paymentHelper;
        
        $this->adminUrlGenerator = $adminUrlGenerator;        
    }

    public static function getEntityFqcn(): string
    {
        return CreditTransaction::class;
    }

    /*
    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id'),
            TextField::new('title'),
            TextEditorField::new('description'),
        ];
    }
    */

    public function configureActions(Actions $actions): Actions
    {
        $viewPurchaseOptions = Action::new('viewPurchaseOptions', 'Purchase Options', 'fa fa-file-invoice')
            ->linkToCrudAction('priceoptions');

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->remove(Crud::PAGE_NEW, Action::SAVE_AND_ADD_ANOTHER)
        ;
    }

    /**
     * @Route("/admin/credit_purchase/checkout", name="admin_credit_purchase_checkout")
     */
    public function priceoptions(Request $request): Response
    {
        $form = $this->createForm(CreditPurchaseCheckoutType::class);
        
        if ($request->isMethod('POST')) {
            $form->handleRequest($request);
            if ($form->isSubmitted() && $form->isValid()) {
                $apiKey = $this->paymentHelper->getApiKey();
                $secretKey = $this->paymentHelper->getSecretKey();

                $data = $form->getData();
                $creditsAmount = $data['creditPurchaseOption'];

                // generates a timestamp like 20230830032723
                $order_ref = date('YmdHis');

                $orderAmount = $this->paymentHelper->getOrderAmount($creditsAmount);

                $checkoutResult = $this->paymentHelper->checkout("Bundle of $creditsAmount credits", $orderAmount, 'Purchase of credits for X', $order_ref, ['api_key' => $apiKey, 'secret_key' => $secretKey]);

                // Return to a route that will handle the payment
                return $this->RedirectToUrl($checkoutResult['redirect_url']);
            }
            else{
                // Add a notification banner
                $this->addFlash('warning', 'Please select a credit purchase option');

                return $this->render('bundles/EasyAdminBundle/page/credit_purchase_options.html.twig', [
                    'form' => $form->createView(),
                ]);
            }

            
        }
        else{
            return $this->render('bundles/EasyAdminBundle/page/credit_purchase_options.html.twig', [
                'form' => $form->createView(),
            ]);
        }
    }

    /**
     * Just to redirect to an external URL
     */
    public function RedirectToUrl($url): RedirectResponse{
        return new RedirectResponse($url);
    }
}
