<?php

namespace App\Entity;

use ApiPlatform\Core\Annotation\ApiResource;
use App\Repository\DeploymentsRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * @ApiResource()
 * @ORM\Entity(repositoryClass=DeploymentsRepository::class)
 * @UniqueEntity(
 *     fields={"domainName"},
 *     message="The domain name {{ value }} is already used by another application."
 * )
 */
class Deployments
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private $id;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $label;

    /**
     * @ORM\Column(type="string", length=50, nullable=true)
     * @Assert\Regex(
     *      pattern="/^(http:\/\/|https:\/\/)*(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/",
     *      message="This domain name is not valid"
     * )
     */
    private $domainName;

    /**
     * @ORM\Column(type="string", length=20)
     */
    private $status = 'active';

    /**
     * @ORM\Column(type="datetime", nullable=false)
     */
    private $created;

    /**
     * @ORM\ManyToOne(targetEntity=Organization::class, inversedBy="services")
     * @ORM\JoinColumn(nullable=false)
     */
    private $organization;

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
     * @ORM\ManyToOne(targetEntity=Service::class, inversedBy="deployments")
     * @ORM\JoinColumn(nullable=false)
     */
    private $service;

    /**
     * @ORM\Column(type="string", length=100)
     */
    private $slug;

    /**
     * @ORM\Column(type="string", length=10, nullable=true)
     */
    private $ServiceVersion;

    /**
     * @ORM\Column(type="string", length=30)
     */
    private $deploymentPlan;
    
    public function __construct()
    {
        $this->deploymentPlan = "essential";
    }

    public function getUpdateInfo()
    {
        if (null != $this->getModified()) {
            return $this->getModified()->format('M d, Y h:i:s').' by '.$this->getModifiedBy();
        }

        return ' - ';
    }

    public function getServiceFullLabel(): ?string
    {
        $deplplan = $this->deploymentPlan == "" ? 'essential' : $this->deploymentPlan;
        return $this->service->getLabel().' '.$this->ServiceVersion.' - '.ucfirst(strtolower($deplplan));
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

    public function getDomainName(): ?string
    {
        return $this->domainName;
    }

    public function setDomainName(?string $domainName): self
    {
        $this->domainName = $domainName;

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

    public function getOrganization(): ?Organization
    {
        return $this->organization;
    }

    public function getOrganizationSlug(): ?string
    {
        return $this->organization->getSlug();
    }

    public function setOrganization(?Organization $organization): self
    {
        $this->organization = $organization;

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

    public function getCreated(): ?\DateTimeInterface
    {
        return $this->created;
    }

    public function setCreated(\DateTimeInterface $created): self
    {
        $this->created = $created;

        return $this;
    }

    public function getService(): ?Service
    {
        return $this->service;
    }

    public function setService(?Service $service): self
    {
        $this->service = $service;

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): self
    {
        $this->slug = $slug;

        return $this;
    }

    public function getServiceVersion(): ?string
    {
        return $this->ServiceVersion;
    }

    public function setServiceVersion(?string $ServiceVersion): self
    {
        $this->ServiceVersion = $ServiceVersion;

        return $this;
    }

    public function getDeploymentPlan(): ?string
    {
        return $this->deploymentPlan;
    }

    public function setDeploymentPlan(string $deploymentPlan): self
    {
        $this->deploymentPlan = $deploymentPlan;

        return $this;
    }
}
