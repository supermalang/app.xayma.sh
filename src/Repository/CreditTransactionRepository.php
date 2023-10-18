<?php

namespace App\Repository;

use App\Entity\CreditTransaction;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CreditTransaction>
 *
 * @method CreditTransaction|null find($id, $lockMode = null, $lockVersion = null)
 * @method CreditTransaction|null findOneBy(array $criteria, array $orderBy = null)
 * @method CreditTransaction[]    findAll()
 * @method CreditTransaction[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CreditTransactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CreditTransaction::class);
    }

    public function add(CreditTransaction $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(CreditTransaction $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Get the Sum of credits used per hour in the last 24 hours by the given organization or all organizations
     * @param int|null $organizationId
     * @return CreditTransaction[]
     */
    public function creditsUsedLast24Hours(?int $organizationId = null): array
    {
        $qb = $this->createQueryBuilder('ct')
        // select average of credits used and max of created date for each hour
            ->select('SUM(ct.creditsUsed) as creditsUsed')
            ->addSelect('MAX(ct.created) as created')
            // add select the max of created date for each hour to group by hour. so format by hour
            ->addSelect('DATE_FORMAT(ct.created, \'%H\') as hour')
            ->where('ct.created >= :date')
            ->setParameter('date', new \DateTime('-24 hours'));

        if ($organizationId) {
            $qb->andWhere('ct.organization = :organizationId')
                ->setParameter('organizationId', $organizationId);
        }

        // Group by hour and average the credits used
        $qb->groupBy('hour')
        ->orderBy('created', 'ASC');
            
        return $qb->getQuery()->getResult();
    }

    public function getLastPurchases(?int $organizationId = null, $limit = 5): array
    {
        $qb = $this->createQueryBuilder('ct')
            ->where('ct.transactionType = :transactionType')
            ->andWhere('ct.status = :status')
            ->setParameter('transactionType', 'credit')
            ->setParameter('status', 'completed');

        if ($organizationId) {
            $qb = $qb->andWhere('ct.organization = :organizationId')
                ->setParameter('organizationId', $organizationId);
        }

        $qb = $qb->orderBy('ct.created', 'DESC')->setMaxResults($limit);

        return $qb->getQuery()->getResult();
    }

//    /**
//     * @return CreditTransaction[] Returns an array of CreditTransaction objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('c')
//            ->andWhere('c.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('c.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?CreditTransaction
//    {
//        return $this->createQueryBuilder('c')
//            ->andWhere('c.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
