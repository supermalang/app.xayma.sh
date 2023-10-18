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

    /**
     * Return the current monthly credits consumption of the organization (or all organizations if no organization is given)
     */
    public function getCurrentMonthlyConsumption(Organization $organization = null)
    {
        $queries = [];
        $monthlyCreditConsumption = 0;

        $essentials_query = $this->createQueryBuilder('d')
            ->select('SUM(s.monthlyCreditConsumption) as creditsConsumed')
            ->join('d.service', 's')
            ->where('d.status = :status');

        $business_query = $this->createQueryBuilder('d')
            ->select('SUM(s.BusinessMonthlyCreditConsumption) as creditsConsumed')
            ->join('d.service', 's')
            ->where('d.status = :status');
            
        $highperformance_query = $this->createQueryBuilder('d')
            ->select('SUM(s.HighPerformanceMonthlyCreditConsumption) as creditsConsumed')
            ->join('d.service', 's')
            ->where('d.status = :status');         

        if ($organization) {
            $essentials_query = $essentials_query->andWhere('d.organization = :organization')
            ->setParameter('organization', $organization);
            $business_query = $business_query->andWhere('d.organization = :organization')
            ->setParameter('organization', $organization);
            $business_query = $business_query->andWhere('d.organization = :organization')
            ->setParameter('organization', $organization);
        }

        array_push($queries, $essentials_query, $business_query, $highperformance_query);
        
        foreach ($queries as $query) {
            $query = $query->setParameter('status', 'active');
            $monthlyCreditConsumption += 0 + $query->getQuery()->getSingleScalarResult();
        }
        
        return $monthlyCreditConsumption;
    }

    // public function to get the last five edited deployments that belong to the given organization. if no organization is given, it will return the last five edited deployments of all organizations 
    public function getLastFiveEditedDeployments(Organization $organization = null)
    {
        $query = $this->createQueryBuilder('d')
            ->orderBy('d.modified', 'DESC')
            ->setMaxResults(5);
            
        if ($organization) {
            $query = $query->andWhere('d.organization = :organization')
                ->setParameter('organization', $organization);
        }
        
        return $query->getQuery()->getResult();
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
