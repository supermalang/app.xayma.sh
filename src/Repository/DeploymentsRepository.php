<?php

namespace App\Repository;

use App\Entity\Deployments;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method null|Deployments find($id, $lockMode = null, $lockVersion = null)
 * @method null|Deployments findOneBy(array $criteria, array $orderBy = null)
 * @method Deployments[]    findAll()
 * @method Deployments[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DeploymentsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Deployments::class);
    }

    // /**
    //  * @return Deployments[] Returns an array of Deployments objects
    //  */
    public function searchBySlug($value)
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.slug LIKE :val')
            ->setParameter('val', '%'.$value.'%')
            ->getQuery()
            ->getResult()
        ;
    }

    // /**
    //  * @return Deployments[] Returns an array of Deployments objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('d.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?Deployments
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
