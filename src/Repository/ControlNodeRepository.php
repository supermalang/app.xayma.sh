<?php

namespace App\Repository;

use App\Entity\ControlNode;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method ControlNode|null find($id, $lockMode = null, $lockVersion = null)
 * @method ControlNode|null findOneBy(array $criteria, array $orderBy = null)
 * @method ControlNode[]    findAll()
 * @method ControlNode[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ControlNodeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ControlNode::class);
    }

    // /**
    //  * @return ControlNode[] Returns an array of ControlNode objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('c.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?ControlNode
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
