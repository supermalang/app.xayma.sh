<?php

namespace App\Controller\Admin;

use App\Entity\User;
use Doctrine\Persistence\ManagerRegistry;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\HttpFoundation\RequestStack;

class UserCrudController extends AbstractCrudController
{
    private $reqStack;

    public function __construct(RequestStack $reqStack, private ManagerRegistry $doctrine)
    {
        $this->reqStack = $reqStack;
    }

    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureFields(string $pageName): iterable
    {
        $rolesField = ChoiceField::new('roles')->allowMultipleChoices()
            ->setChoices(['Customer' => 'ROLE_USER', 'Help-Desk' => 'ROLE_SUPPORT', 'Admin' => 'ROLE_ADMIN'])
        ;
        $emailField = EmailField::new('email', 'e-Mail');

        // Only admins should be able to edit roles and emails/usernames
        if (false == $this->isGranted('ROLE_ADMIN')) {
            $rolesField = $rolesField->setDisabled(true);
            $emailField = $emailField->setDisabled(true);
        }

        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('firstName', 'Prenom(s)'),
            TextField::new('lastName', 'Nom'),
            $emailField,
            TextField::new('password', 'Mot de passe')->setFormType(PasswordType::class)->onlyWhenCreating(),
            $rolesField,
        ];
    }

    public function configureActions(Actions $actions): Actions
    {
        $id = $this->reqStack->getCurrentRequest()->query->get('entityId') ? $this->reqStack->getCurrentRequest()->query->get('entityId') : $this->getUser()->getId();

        // We use this variable in case an admin or help-desk user wants to update another user from the User Index page > Edit page
        $userToUpdate = $this->doctrine->getRepository($this->getEntityFqcn())->find($id);

        // We use this variable to check roles and permissions of the current logged in user
        $loggedInUser = $this->getUser();

        /**
         * Permissions definitions:
         * * An admin can update passwords of all users that are not admins
         * * A help-desk user can update passwords of all customers
         * * Otherwise logged in users update only their own password.
         */
        $updatePassword = Action::new('updatePassword', 'Update password', 'fas fa-user-edit')
            ->linkToCrudAction('updatePassword')
            ->setCssClass('text-warning btn btn-link')
            ->displayIf(
                fn () => (in_array('ROLE_ADMIN', $loggedInUser->getRoles()) && !in_array('ROLE_ADMIN', $userToUpdate->getRoles()))
                      || (in_array('ROLE_SUPPORT', $loggedInUser->getRoles()) && !in_array('ROLE_ADMIN', $userToUpdate->getRoles()) && !in_array('ROLE_SUPPORT', $userToUpdate->getRoles()))
                      || ($loggedInUser->getId() == $userToUpdate->getId())
            )
        ;

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $updatePassword)
            ->setPermission(Action::NEW, 'ROLE_ADMIN')
            ->setPermission(Action::EDIT, 'ROLE_SUPPORT')
            ->setPermission(Action::DELETE, 'ROLE_ADMIN')
            ->setPermission(Action::INDEX, 'ROLE_SUPPORT')
        ;
    }

    public function updatePassword(AdminContext $context)
    {
        $id = $context->getRequest()->query->get('entityId');

        // We use this variable in case an admin or help-desk user wants to update another user from the User Index page > Edit page
        $userToUpdate = $this->doctrine->getRepository($this->getEntityFqcn())->find($id);

        // We use this variable to check roles and permissions of the current logged in user
        $loggedInUser = $this->getUser();

        $updatePasswordUrl = $this->container->get(AdminUrlGenerator::class)->setController(User2CrudController::class)->setAction('edit');

        // An admin can update passwords of all users that are not admins
        if (fn ($loggedInUser) => (in_array('ROLE_ADMIN', $loggedInUser->getRoles()) && !in_array('ROLE_ADMIN', $userToUpdate->getRoles()))) {
            $updatePasswordUrl->setEntityId($userToUpdate->getId());
        }
        // A help-desk user can update passwords of all customers
        elseif (fn ($loggedInUser) => (in_array('ROLE_SUPPORT', $loggedInUser->getRoles()) && !in_array('ROLE_ADMIN', $userToUpdate->getRoles()) && !in_array('ROLE_SUPPORT', $userToUpdate->getRoles()))) {
            $updatePasswordUrl->setEntityId($userToUpdate->getId());
        }
        // Otherwise users update only their own password
        else {
            $updatePasswordUrl->setEntityId($userToUpdate->getId());
        }

        return $this->redirect($updatePasswordUrl->generateUrl());
    }
}
