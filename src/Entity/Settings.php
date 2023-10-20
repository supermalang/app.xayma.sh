<?php

namespace App\Entity;

use App\Repository\SettingsRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * @ORM\Entity(repositoryClass=SettingsRepository::class)
 */
class Settings
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="integer")
     */
    private $MaxDaysToArchiveDepl;

    /**
     * @ORM\Column(type="integer")
     */
    private $MaxDaysToDeleteDepl;

    /**
     * @ORM\Column(type="integer")
     */
    private $MaxDaysToArchiveOrgs;

    /**
     * @ORM\Column(type="integer")
     */
    private $MaxDaysToDeleteOrgs;

    /**
     * @ORM\Column(type="integer")
     */
    private $LowCreditThreshold;

    /**
     * @ORM\Column(type="integer")
     */
    private $MaxCreditsDebt;

    /**
     * @ORM\Column(type="float", nullable=true)
     */
    private $CreditPrice;

    /**
     * @ORM\Column(type="datetime")
     */
    private $created;

    /**
     * @ORM\ManyToOne(targetEntity=User::class)
     * @ORM\JoinColumn(nullable=false)
     */
    private $createdBy;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $modified;

    /**
     * @ORM\ManyToOne(targetEntity=User::class)
     */
    private $modifiedBy;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $paymentApiKey;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $paymentSecretKey;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $PaymentSuccessUrl;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $PaymentCancelUrl;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     * Add a regex to validate the url
     * @Assert\Regex(
     *    pattern="/^https?:\/\/[\w\-]+(\.[\w\-]+)+[\/#?]?.*({#}).*$/",
     *   message="The value '{{ value }}' is not an accepted url. Please make sure your give a correct URL which contains '{#}' for the transaction id.",
     * )
     */
    private $PaymentIpnUrl;
    
    public function __construct(){
        $this->created = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getMaxDaysToArchiveDepl(): ?int
    {
        return $this->MaxDaysToArchiveDepl;
    }

    public function setMaxDaysToArchiveDepl(int $MaxDaysToArchiveDepl): self
    {
        $this->MaxDaysToArchiveDepl = $MaxDaysToArchiveDepl;

        return $this;
    }

    public function getMaxDaysToDeleteDepl(): ?int
    {
        return $this->MaxDaysToDeleteDepl;
    }

    public function setMaxDaysToDeleteDepl(int $MaxDaysToDeleteDepl): self
    {
        $this->MaxDaysToDeleteDepl = $MaxDaysToDeleteDepl;

        return $this;
    }

    public function getMaxDaysToArchiveOrgs(): ?int
    {
        return $this->MaxDaysToArchiveOrgs;
    }

    public function setMaxDaysToArchiveOrgs(int $MaxDaysToArchiveOrgs): self
    {
        $this->MaxDaysToArchiveOrgs = $MaxDaysToArchiveOrgs;

        return $this;
    }

    public function getMaxDaysToDeleteOrgs(): ?int
    {
        return $this->MaxDaysToDeleteOrgs;
    }

    public function setMaxDaysToDeleteOrgs(int $MaxDaysToDeleteOrgs): self
    {
        $this->MaxDaysToDeleteOrgs = $MaxDaysToDeleteOrgs;

        return $this;
    }

    public function getLowCreditThreshold(): ?int
    {
        return $this->LowCreditThreshold;
    }

    public function setLowCreditThreshold(int $LowCreditThreshold): self
    {
        $this->LowCreditThreshold = $LowCreditThreshold;

        return $this;
    }

    public function getMaxCreditsDebt(): ?int
    {
        return $this->MaxCreditsDebt;
    }

    public function setMaxCreditsDebt(int $MaxCreditsDebt): self
    {
        $this->MaxCreditsDebt = $MaxCreditsDebt;

        return $this;
    }

    public function getCreditPrice(): ?float
    {
        return $this->CreditPrice;
    }

    public function setCreditPrice(?float $CreditPrice): self
    {
        $this->CreditPrice = $CreditPrice;

        return $this;
    }

    public function getCreated(): ?\DateTimeInterface
    {
        return $this->created;
    }

    public function setCreated(\DateTimeInterface $created): self
    {
        $this->created = $created;

        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function setCreatedBy(?User $createdBy): self
    {
        $this->createdBy = $createdBy;

        return $this;
    }

    public function getModified(): ?\DateTimeInterface
    {
        return $this->modified;
    }

    public function setModified(?\DateTimeInterface $modified): self
    {
        $this->modified = $modified;

        return $this;
    }

    public function getModifiedBy(): ?User
    {
        return $this->modifiedBy;
    }

    public function setModifiedBy(?User $modifiedBy): self
    {
        $this->modifiedBy = $modifiedBy;

        return $this;
    }

    public function getPaymentApiKey(): ?string
    {
        return $this->paymentApiKey;
    }

    public function setPaymentApiKey(string $paymentApiKey): self
    {
        $this->paymentApiKey = $paymentApiKey;

        return $this;
    }

    public function getPaymentSecretKey(): ?string
    {
        return $this->paymentSecretKey;
    }

    public function setPaymentSecretKey(?string $paymentSecretKey): self
    {
        $this->paymentSecretKey = $paymentSecretKey;

        return $this;
    }

    public function getPaymentSuccessUrl(): ?string
    {
        return $this->PaymentSuccessUrl;
    }

    public function setPaymentSuccessUrl(?string $PaymentSuccessUrl): self
    {
        $this->PaymentSuccessUrl = $PaymentSuccessUrl;

        return $this;
    }

    public function getPaymentCancelUrl(): ?string
    {
        return $this->PaymentCancelUrl;
    }

    public function setPaymentCancelUrl(?string $PaymentCancelUrl): self
    {
        $this->PaymentCancelUrl = $PaymentCancelUrl;

        return $this;
    }

    public function getPaymentIpnUrl(): ?string
    {
        return $this->PaymentIpnUrl;
    }

    public function setPaymentIpnUrl(?string $PaymentIpnUrl): self
    {
        $this->PaymentIpnUrl = $PaymentIpnUrl;

        return $this;
    }
}
