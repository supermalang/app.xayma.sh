<?php

namespace App\Repository;

use App\Entity\Organization;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method null|Organization find($id, $lockMode = null, $lockVersion = null)
 * @method null|Organization findOneBy(array $criteria, array $orderBy = null)
 * @method Organization[]    findAll()
 * @method Organization[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class OrganizationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Organization::class);
    }

    public function searchBySlug($value)
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.slug LIKE :val')
            ->setParameter('val', '%'.$value.'%')
            ->getQuery()
            ->getResult()
        ;
    }

    public function findOneBySomeField($value): ?Organization
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.label = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }

    /**
     * Get all organizations that have 0 remainingCredits and can have a credit debt
     */
    public function findAllOnDebt()
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.remainingCredits <= 0')
            ->andWhere('o.allowCreditDebt = true')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Get all organizations that have 0 remainingCredits and cannot have a credit debt
     */
    public function findAllWithoutCredit()
    {
        return $this->createQueryBuilder('o')
            ->andWhere('o.remainingCredits <= 0')
            ->andWhere('o.allowCreditDebt = false')
            ->getQuery()
            ->getResult()
        ;
    }

    /**
     * Get all organizations that are below the low credit threshold, but still have credits
     */
    public function findAllLowCredit($lowCreditThreshold){
        return $this->createQueryBuilder('o')
            ->andWhere('o.remainingCredits < :lowCreditThreshold')
            ->andWhere('o.remainingCredits > 0')
            ->setParameter('lowCreditThreshold', $lowCreditThreshold)
            ->getQuery()
            ->getResult()
        ;
    }    
    
    /** Get all organization that have credits below the MaxCreditsDebt */
    public function findAllBeyondMaxDebt($MaxCreditsDebt){
        return $this->createQueryBuilder('o')
            ->andWhere('o.remainingCredits < :MaxCreditsDebt')
            ->setParameter('MaxCreditsDebt', (-1 * $MaxCreditsDebt))
            ->getQuery()
            ->getResult()
        ;
    }

}
