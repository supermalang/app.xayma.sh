<?php

namespace App\Entity;

use App\Repository\ServiceRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=ServiceRepository::class)
 */
class Service
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="string", length=50)
     */
    private $label;

    /**
     * @ORM\Column(type="text", nullable=true)
     */
    private $description;

    /**
     * @ORM\ManyToOne(targetEntity=ControlNode::class, inversedBy="services")
     */
    private $controleNode;

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
     * @ORM\OneToMany(targetEntity=Deployments::class, mappedBy="service")
     */
    private $deployments;

    /**
     * @ORM\Column(type="integer")
     */
    private $awxId;

    /**
     * @ORM\Column(type="string", length=8, nullable=true)
     */
    private $version;

    public function __construct()
    {
        $this->deployments = new ArrayCollection();
    }

    public function __toString()
    {
        return $this->getLabel();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function setLabel(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    public function getControleNode(): ?ControlNode
    {
        return $this->controleNode;
    }

    public function setControleNode(?ControlNode $controleNode): self
    {
        $this->controleNode = $controleNode;

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

    /**
     * @return Collection|Deployments[]
     */
    public function getDeployments(): Collection
    {
        return $this->deployments;
    }

    public function addDeployment(Deployments $deployment): self
    {
        if (!$this->deployments->contains($deployment)) {
            $this->deployments[] = $deployment;
            $deployment->setService($this);
        }

        return $this;
    }

    public function removeDeployment(Deployments $deployment): self
    {
        if ($this->deployments->contains($deployment)) {
            $this->deployments->removeElement($deployment);
            // set the owning side to null (unless already changed)
            if ($deployment->getService() === $this) {
                $deployment->setService(null);
            }
        }

        return $this;
    }

    public function getAwxId(): ?int
    {
        return $this->awxId;
    }

    public function setAwxId(int $awxId): self
    {
        $this->awxId = $awxId;

        return $this;
    }

    public function getVersion(): ?string
    {
        return $this->version;
    }

    public function setVersion(?string $version): self
    {
        $this->version = $version;

        return $this;
    }
}
