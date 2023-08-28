<?php

namespace App\Repository;

use App\Entity\Deployments;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use App\Entity\Organization;


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

    public function getCurrentMonthlyConsumption(Organization $organization)
    {
        return $this->createQueryBuilder('d')
            ->select('SUM(s.monthlyCreditConsumption) as creditsConsumed')
            ->join('d.service', 's')
            ->where('d.organization = :organization')
            ->andWhere('d.status = :status')
            ->setParameter('organization', $organization)
            ->setParameter('status', 'active')
            ->getQuery()
            ->getSingleScalarResult();
    }

    // public function to get the last five edited deployments that belong to the given organization. if no organization is given, it will return the last five edited deployments of all organizations 
    public function getLastFiveEditedDeployments(Organization $organization = null)
    {
        $query = $this->createQueryBuilder('d')
            ->orderBy('d.modified', 'DESC')
            ->setMaxResults(5)
            ->getQuery();

        if ($organization) {
            $query->andWhere('d.organization = :organization')
                ->setParameter('organization', $organization);
        }

        return $query->getResult();
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
