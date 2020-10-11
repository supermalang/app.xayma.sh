<?php

namespace App\Service;

use Artgris\Bundle\FileManagerBundle\Service\CustomConfServiceInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\String\Slugger\AsciiSlugger;

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
        // Custotmers will be able to see only their organization folders
        else {
            $organizations_array = $this->user->getOrganizations()->toArray();
            $first_organization = $organizations_array[0]->getLabel();

            $slugger = new AsciiSlugger();

            $dir = '../public/uploads/'.strtolower($slugger->slug($first_organization));
        }

        // Create the organization directory if it does not exist
        $fs = new Filesystem();
        if (!$fs->exists($dir)) {
            $fs->mkdir($dir);
        }

        // Only accept Zip files so that we can extract them and keep the folder hierachy
        return [
            'dir' => $dir,
            'regex' => '.(zip)$',
            'accept' => '.zip,.ZIP',
        ];
    }
}
