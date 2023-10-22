<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;


class Notifier
{
    private $mailer;

    public function __construct(MailerInterface $mailer){
        $this->mailer = $mailer;
    }

    public function sendEmail($from, $to, $subject, $content){
        $email = (new Email())
            ->from($from)
            ->to($to)
            ->subject($subject)
            ->text($content)
            ->html("<p>$content</p>");

        $this->mailer->send($email);
    }
}
