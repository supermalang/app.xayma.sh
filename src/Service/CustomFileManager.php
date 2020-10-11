<?php

namespace App\Service;

use Artgris\Bundle\FileManagerBundle\Service\CustomConfServiceInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class CustomFileManager implements CustomConfServiceInterface
{
    private $user;

    public function __construct(TokenStorageInterface $tokenstorage)
    {
        $this->user = $tokenstorage->getToken()->getUser();
    }

    public function getConf($extra = [])
    {
        // Admins can see all organization folders
        if (in_array('ROLE_SUPPORT', $this->user->getRoles()) || in_array('ROLE_ADMIN', $this->user->getRoles())) {
            $dir = '../public/uploads/';
        }
        // Customers will be able to see only their organization folders
        else {
            $organizations_array = $this->user->getOrganizations()->toArray();
            $first_organization = $organizations_array[0]->getSlug();

            $dir = '../public/uploads/'.$first_organization;
        }

        // Create the organization directory if it does not exist
        $fs = new Filesystem();
        if (!$fs->exists($dir)) {
            $fs->mkdir($dir);
        }

        // Only accept Zip files so that we can extract them and keep the folder hierachy
        return [
            'dir' => $dir,
            //'regex' => '.(zip)$',
            'accept' => '.zip,.ZIP',
        ];
    }
}
