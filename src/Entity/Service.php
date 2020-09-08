<?php

namespace App\Entity;

use App\Repository\ServiceRepository;
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
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $tags;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $skipTags;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $variables;

    /**
     * @ORM\ManyToOne(targetEntity=ControlNode::class, inversedBy="services")
     */
    private $controleNode;

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

    public function getTags(): ?string
    {
        return $this->tags;
    }

    public function setTags(?string $tags): self
    {
        $this->tags = $tags;

        return $this;
    }

    public function getSkipTags(): ?string
    {
        return $this->skipTags;
    }

    public function setSkipTags(?string $skipTags): self
    {
        $this->skipTags = $skipTags;

        return $this;
    }

    public function getVariables(): ?string
    {
        return $this->variables;
    }

    public function setVariables(?string $variables): self
    {
        $this->variables = $variables;

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
}
