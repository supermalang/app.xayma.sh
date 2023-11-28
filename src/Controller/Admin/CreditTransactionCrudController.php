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
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TelephoneField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;

class CreditTransactionCrudController extends AbstractCrudController
{
    const SYSTEM_USER_ID = 1;
    
    private $paymentHelper;
    private $adminUrlGenerator;
    private $userRepository;
    private $em;

    public function __construct(PaymentHelper $paymentHelper, AdminUrlGenerator $adminUrlGenerator, UserRepository $userRepository, EntityManagerInterface $em, private ManagerRegistry $doctrine)
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

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Credit Transaction')
            ->setEntityLabelInPlural('Credit Transactions')
            ->setEntityPermission('ROLE_SUPPORT')
            ->setPageTitle('new', 'New Credit Transaction')
        ;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            AssociationField::new('organization')->setColumns(7),
            ChoiceField::new('transactionType', 'Transaction Type')
                ->setChoices([
                    'Credit' => 'credit', 
                    'Debit' => 'debit'
                ])
                ->renderAsBadges([
                    'credit' => 'success',
                    'debit' => 'danger',
                ])->setColumns(7),
            IntegerField::new('amountPaid')->setColumns(7),
            IntegerField::new('creditsPurchased')->setColumns(7),
            NumberField::new('creditsUsed')->setColumns(7),
            NumberField::new('creditsRemaining')->setColumns(7)->hideOnForm(),
            TextField::new('paymentMethod')->onlyOnDetail(),
            TelephoneField::new('customerPhone')->hideOnIndex()->hideOnForm(),
            TextField::new('status')->onlyOnDetail(),
            TextField::new('orgCurrentStatus')->onlyOnDetail(),
            DateTimeField::new('created')->onlyOnDetail()->hideOnForm(),
            AssociationField::new('createdBy')->onlyOnDetail()->hideOnForm(),
            DateTimeField::new('modified')->onlyOnDetail()->hideOnForm(),
            AssociationField::new('modifiedBy')->onlyOnDetail()->hideOnForm(),
        ];
    }

    public function createIndexQueryBuilder(SearchDto $searchDto, EntityDto $entityDto, FieldCollection $fields, FilterCollection $filters): QueryBuilder
    {
        return $this->doctrine->getRepository(CreditTransaction::class)->createQueryBuilder('entity')
        // Get only results from the last 3 days
        ->where('entity.created >= :date')
        ->setParameter('date', new \DateTime('-3 days'))
        ->orderBy('entity.created', 'DESC')
        ;
    }

    public function configureActions(Actions $actions): Actions
    {
        $viewPurchaseOptions = Action::new('viewPurchaseOptions', 'Purchase Options', 'fa fa-file-invoice')
            ->linkToCrudAction('priceoptions');

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->remove(Crud::PAGE_NEW, Action::SAVE_AND_ADD_ANOTHER)
            ->setPermission(Action::NEW, 'ROLE_ADMIN')
            ->setPermission(Action::EDIT, 'ROLE_ADMIN')
            ->setPermission(Action::DELETE, 'ROLE_ADMIN')
        ;
    }

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
                else{
                    return $this->render('bundles/TwigBundle/Exception/customerror.html.twig', [
                        'messages' => $checkoutResult['errors'],
                    ]);
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
