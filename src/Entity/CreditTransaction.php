<?php

namespace App\Entity;

use App\Repository\CreditTransactionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * @ORM\Entity(repositoryClass=CreditTransactionRepository::class)
 */
class CreditTransaction
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
    private $creditsPurchased;

    /**
     * @ORM\Column(type="integer")
     */
    private $amountPaid;

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
     * Can be 'debit' or 'credit'
     * @ORM\Column(type="string", length=20)
     */
    private $transactionType;

    /**
     * @ORM\Column(type="integer")
     */
    private $creditsUsed;

    /**
     * @ORM\Column(type="integer")
     */
    private $creditsRemaining;

    /**
     * @ORM\ManyToOne(targetEntity=Organization::class)
     * @ORM\JoinColumn(nullable=false)
     */
    private $organization;

    /**
     * Can be 'pending', 'completed', 'failed'
     * A 'pending' transaction is one that has been created but not yet paid for
     * A 'completed' transaction is one that has been paid for and the credits have been added to the organization's account
     * A 'failed' transaction is one that has been paid for but the credits have not been added to the organization's account
     * This can happen if the IPN is not received or if the IPN is received but the credits are not added to the organization's account
     * The IPN is received when the user is redirected back to the site after payment
     * 
     * @ORM\Column(type="string", length=20)
     * @Assert\Choice(choices={"pending", "completed", "failed"})
     */
    private $status;

    /**
     * @ORM\Column(type="string", length=15, nullable=true)
     */
    private $customerPhone;

    /**
     * @ORM\Column(type="string", length=50, nullable=true)
     */
    private $paymentMethod;

    public function __construct()
    {
        // Can be 'debit' or 'credit'
        $this->transactionType = 'debit';
        $this->creditsUsed = 0;
        $this->creditsRemaining = 0;
        $this->creditsPurchased = 0;
        $this->amountPaid = 0;
        $this->status = 'pending';
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCreditsPurchased(): ?int
    {
        return $this->creditsPurchased;
    }

    public function setCreditsPurchased(int $creditsPurchased): self
    {
        $this->creditsPurchased = $creditsPurchased;

        return $this;
    }

    public function getAmountPaid(): ?int
    {
        return $this->amountPaid;
    }

    public function setAmountPaid(int $amountPaid): self
    {
        $this->amountPaid = $amountPaid;

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

    public function getTransactionType(): ?string
    {
        return $this->transactionType;
    }

    public function setTransactionType(string $transactionType): self
    {
        $this->transactionType = $transactionType;

        return $this;
    }

    public function getCreditsUsed(): ?int
    {
        return $this->creditsUsed;
    }

    public function setCreditsUsed(int $creditsUsed): self
    {
        $this->creditsUsed = $creditsUsed;

        return $this;
    }

    public function getCreditsRemaining(): ?int
    {
        return $this->creditsRemaining;
    }

    public function setCreditsRemaining(int $creditsRemaining): self
    {
        $this->creditsRemaining = $creditsRemaining;

        return $this;
    }

    public function getOrganization(): ?Organization
    {
        return $this->organization;
    }

    public function setOrganization(?Organization $organization): self
    {
        $this->organization = $organization;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getCustomerPhone(): ?string
    {
        return $this->customerPhone;
    }

    public function setCustomerPhone(?string $customerPhone): self
    {
        $this->customerPhone = $customerPhone;

        return $this;
    }

    public function getPaymentMethod(): ?string
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(?string $paymentMethod): self
    {
        $this->paymentMethod = $paymentMethod;

        return $this;
    }
}
