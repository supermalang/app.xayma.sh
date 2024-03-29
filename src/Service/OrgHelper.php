<?php

namespace App\Service;

use App\Entity\User;

/** Service utility that has some useful functions */
class OrgHelper
{
    public function getCategories()
    {
        return [
            'Food / Catering' => 'Food / Catering',
            'Bank' => 'Bank',
            'Wood / Paper / Cardboard / Printing' => 'Wood / Paper / Cardboard / Printing',
            'Construction / Construction materials' => 'Construction / Construction materials',
            'Chemistry / Parachemistry' => 'Chemistry / Parachemistry',
            'Trade / Trading / Distribution' => 'Trade / Trading / Distribution',
            'Publishing / Communication / Multimedia' => 'Publishing / Communication / Multimedia',
            'Electronics / Electricity' => 'Electronics / Electricity',
            'Studies and advice' => 'Studies and advice',
            'Pharmaceutical industry' => 'Pharmaceutical industry',
            'IT / Telecoms' => 'IT / Telecoms',
            'Machinery and equipment / Automotive' => 'Machinery and equipment / Automotive',
            'Metallurgy / Metalworking' => 'Metallurgy / Metalworking',
            'Plastic / rubber' => 'Plastic / rubber',
            'Business services' => 'Business services',
            'Textile / Clothing / Footwear / Fashion' => 'Textile / Clothing / Footwear / Fashion',
            'Transport / Logistics' => 'Transport / Logistics',
        ];
    }

    public function getCategoriesFr()
    {
        return [
            'Agroalimentaire / Restauration',
            'Banque / Assurance',
            'Bois / Papier / Carton / Imprimerie',
            'BTP / Matériaux de construction',
            'Chimie / Parachimie',
            'Commerce / Négoce / Distribution',
            'Édition / Communication / Multimédia',
            'Électronique / Électricité',
            'Études et conseils',
            'Industrie pharmaceutique',
            'Informatique / Télécoms',
            'Machines et équipements / Automobile',
            'Métallurgie / Travail du métal',
            'Plastique / Caoutchouc',
            'Services aux entreprises',
            'Textile / Habillement / Chaussure / Fashion',
            'Transports / Logistique',
        ];
    }

    public function isCustomerOrgSuspended(User $user)
    {
        $is_advanced_user = false;
        $firstOrgStatus = $user->getOrganizations()[0] ? $user->getOrganizations()[0]->getStatus() : null;

        if (count(array_intersect($user->getRoles(), ['ROLE_SUPPORT', 'ROLE_ADMIN'])) > 0) {
            // at least user has one of the roles ROLE_SUPPORT or ROLE_ADMIN
            $is_advanced_user = true;
        }

        if (!$is_advanced_user && 'suspended' == $firstOrgStatus) {
            return true;
        }

        return false;
    }

    public function isCustomerOrgCreditsFinished(User $user)
    {
        $is_advanced_user = false;
        $firstOrgCredits = $user->getOrganizations()[0] ? $user->getOrganizations()[0]->getRemainingCredits() : null;

        if (count(array_intersect($user->getRoles(), ['ROLE_SUPPORT', 'ROLE_ADMIN'])) > 0) {
            // at least user has one of the roles ROLE_SUPPORT or ROLE_ADMIN
            $is_advanced_user = true;
        }

        if (!$is_advanced_user && $firstOrgCredits <= 0) {
            return true;
        }

        return false;
    }


}
