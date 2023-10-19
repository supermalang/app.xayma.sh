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
        $monthlyCreditConsumption = 0;

        $query = $this->createQueryBuilder('d')
            ->select('d.deploymentPlan')
            ->addSelect('SUM(s.monthlyCreditConsumption) as essential')
            ->addSelect('SUM(s.BusinessMonthlyCreditConsumption) as business')
            ->addSelect('SUM(s.HighPerformanceMonthlyCreditConsumption) as performance')
            ->join('d.service', 's')
            ->where('d.status = :status');

        if ($organization) {
            $query = $query->andWhere('d.organization = :organization')
            ->setParameter('organization', $organization);
        }

        $query = $query->setParameter('status', 'active')->groupBy('d.deploymentPlan');
        $queryResult = $query->getQuery()->getResult();
        
        foreach ($query->getQuery()->getResult() as $key => $item) {
            $deploymentPlan = $item['deploymentPlan'];
            $monthlyCreditConsumption += $item[$deploymentPlan];
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
