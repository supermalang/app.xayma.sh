<?php

namespace App\Repository;

use App\Entity\AddonsFolder;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @method AddonsFolder|null find($id, $lockMode = null, $lockVersion = null)
 * @method AddonsFolder|null findOneBy(array $criteria, array $orderBy = null)
 * @method AddonsFolder[]    findAll()
 * @method AddonsFolder[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class AddonsFolderRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AddonsFolder::class);
    }

    // /**
    //  * @return AddonsFolder[] Returns an array of AddonsFolder objects
    //  */
    /*
    public function findByExampleField($value)
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.exampleField = :val')
            ->setParameter('val', $value)
            ->orderBy('a.id', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult()
        ;
    }
    */

    /*
    public function findOneBySomeField($value): ?AddonsFolder
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }
    */
}
