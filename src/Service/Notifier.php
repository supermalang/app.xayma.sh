<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;

class Notifier
{
    private $mailer;

    public function __construct(MailerInterface $mailer){
        $this->mailer = $mailer;
    }

    public function sendDeploymentUpdateEmail($to, $subject, $content){
        $email = (new TemplatedEmail())
            ->to($to)
            ->subject($subject)
            ->htmlTemplate('emails/deployment-update.html.twig')
            ->textTemplate('emails/deployment-update.html.twig')
            ->context($content)
            ;
            

        try {
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            // TODO: Log the error
        }
    }

    public function sendLowCreditsEmail($to, $subject, $content){
        $email = (new TemplatedEmail())
            ->to($to)
            ->subject($subject)
            ->htmlTemplate('emails/organization-low-credit.html.twig')
            ->textTemplate('emails/organization-low-credit.html.twig')
            ->context($content)
            ;
            

        try {
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            // TODO: Log the error
        }
    }
}
