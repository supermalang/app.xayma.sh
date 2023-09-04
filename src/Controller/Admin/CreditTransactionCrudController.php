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
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreditTransactionCrudController extends AbstractCrudController
{
    const SYSTEM_USER_ID = 1;

    public function __construct(PaymentHelper $paymentHelper, AdminUrlGenerator $adminUrlGenerator, UserRepository $userRepository, EntityManagerInterface $em)
    {
        $this->paymentHelper = $paymentHelper;
        $this->adminUrlGenerator = $adminUrlGenerator;
        $this->userRepository = $userRepository;
        $this->em = $em;
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
                $data = $form->getData();
                $creditsAmount = $data['creditPurchaseOption'];
                $orderAmount = $this->paymentHelper->getOrderAmount($creditsAmount);

                // generates a timestamp like 20230830032723
                $order_ref = date('YmdHis');

                // Generate a new credit transaction
                $creditTransaction = new CreditTransaction();
                $creditTransaction->setCreditsPurchased($creditsAmount);
                $creditTransaction->setCreated(new \DateTime());
                $creditTransaction->setCreatedBy($this->userRepository->find(self::SYSTEM_USER_ID));
                $creditTransaction->setStatus('pending');
                $creditTransaction->setTransactionType('credit'); // Can be credit or debit
                $creditTransaction->setAmountPaid($orderAmount);
                $creditTransaction->setOrganization($this->getUser()->getOrganizations()[0]);

                // Save the entity
                $this->em->persist($creditTransaction);
                $this->em->flush();

                // Get the ID of the new entity
                $creditTransactionId = $creditTransaction->getId();

                $checkoutResult = $this->paymentHelper->checkout("Pack de $creditsAmount credits", $orderAmount, "Purchase of $creditsAmount credits for ".$this->getUser()->getOrganizations()[0]->__tostring(), $order_ref, $creditTransactionId);

                if($checkoutResult['success'] == 1){
                    // Get us to an (external) route that will handle the payment
                    return $this->RedirectToUrl($checkoutResult['redirect_url']);
                }
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
