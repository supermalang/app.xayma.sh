<?php

namespace App\Entity;

use App\Repository\CreditTransactionRepository;
use Doctrine\ORM\Mapping as ORM;

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
}
