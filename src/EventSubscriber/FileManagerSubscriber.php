<?php

namespace App\EventSubscriber;

use Artgris\Bundle\FileManagerBundle\Event\FileManagerEvents;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\EventDispatcher\GenericEvent;
use Symfony\Component\Filesystem\Filesystem;
use ZipArchive;

class FileManagerSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            FileManagerEvents::POST_UPDATE => [
                ['extractZipFile', 40],
            ],
        ];
    }

    /** Extracts the Zip files the user has uploaded */
    public function extractZipFile(GenericEvent $event)
    {
        $zip = new ZipArchive();
        $fs = new Filesystem();

        $responses = $event->getArgument('response');
        $filePath = $event->getSubject()->getCurrentPath() ?? null;
        $files = $responses['files'];

        foreach ($files as $file) {
            $filename = $file->name;
            if ($zip->open($filePath.'/'.$filename)) {
                $zip->extractTo($filePath);
                $zip->close();

                $fs->remove($filePath.'/'.$filename);
            }
        }
    }
}
