/**
 * Vue Router configuration
 * Route guards enforce role-based access via requireRole meta
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'

// Layouts
const AppLayout = () => import('@/layouts/AppLayout.vue')
const AuthLayout = () => import('@/layouts/AuthLayout.vue')

// Pages
const Dashboard = () => import('@/pages/Dashboard.vue')
const Login = () => import('@/pages/Login.vue')
const Register = () => import('@/pages/Register.vue')
const NotFound = () => import('@/pages/NotFound.vue')
const Partners = () => import('@/pages/Partners.vue')
const PartnerDetail = () => import('@/pages/PartnerDetail.vue')
const Users = () => import('@/pages/Users.vue')
const UserDetail = () => import('@/pages/UserDetail.vue')
const Profile = () => import('@/pages/Profile.vue')
const AuditLog = () => import('@/pages/AuditLog.vue')
const ControlNodes = () => import('@/pages/ControlNodes.vue')
const Services = () => import('@/pages/Services.vue')
const ServiceDetail = () => import('@/pages/ServiceDetail.vue')
const Settings = () => import('@/pages/Settings.vue')
const Deployments = () => import('@/pages/Deployments.vue')
const DeploymentDetail = () => import('@/pages/DeploymentDetail.vue')
const DeploymentWizard = () => import('@/pages/DeploymentWizard.vue')
const CreditsBuy = () => import('@/pages/Credits/Buy.vue')
const CreditsSuccess = () => import('@/pages/Credits/Success.vue')
const CreditsCancel = () => import('@/pages/Credits/Cancel.vue')
const CreditsHistory = () => import('@/pages/Credits/History.vue')
const CreditPurchaseOptions = () => import('@/pages/CreditPurchaseOptions.vue')
const VouchersManagement = () => import('@/pages/Vouchers/Management.vue')
const Notifications = () => import('@/pages/Notifications.vue')
const Portfolio = () => import('@/pages/Portfolio.vue')
const Commissions = () => import('@/pages/Commissions.vue')

const routes: RouteRecordRaw[] = [
  // Authenticated routes
  {
    path: '/',
    component: AppLayout,
    meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES'] },
    children: [
      {
        path: '',
        component: Dashboard,
        meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES'] },
      },
      {
        path: 'partners',
        component: Partners,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'partners/:id',
        component: PartnerDetail,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'users',
        component: Users,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'users/:id',
        component: UserDetail,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'profile',
        component: Profile,
        meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES', 'SUPPORT'] },
      },
      {
        path: 'audit',
        component: AuditLog,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'control-nodes',
        component: ControlNodes,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'services',
        component: Services,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'services/:id',
        component: ServiceDetail,
        meta: { requiredRole: ['ADMIN'] },
      },
      {
        path: 'deployments',
        component: Deployments,
        meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER'] },
      },
      {
        path: 'deployments/new',
        component: DeploymentWizard,
        meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
      },
      {
        path: 'deployments/:id',
        component: DeploymentDetail,
        meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER'] },
      },
      {
        path: 'credits/buy',
        component: CreditsBuy,
        meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
        name: 'credits-buy',
      },
      {
        path: 'credits/success',
        component: CreditsSuccess,
        meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
        name: 'credits-success',
      },
      {
        path: 'credits/cancel',
        component: CreditsCancel,
        meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
        name: 'credits-cancel',
      },
      {
        path: 'credits/history',
        component: CreditsHistory,
        meta: { requiredRole: ['CUSTOMER', 'RESELLER'] },
        name: 'credits-history',
      },
      {
        path: 'credits/purchase-options',
        component: CreditPurchaseOptions,
        meta: { requiredRole: ['ADMIN'] },
        name: 'credit-purchase-options',
      },
      {
        path: 'vouchers',
        component: VouchersManagement,
        meta: { requiredRole: ['ADMIN'] },
        name: 'vouchers-management',
      },
      {
        path: 'notifications',
        component: Notifications,
        meta: { requiredRole: ['ADMIN', 'CUSTOMER', 'RESELLER', 'SALES'] },
        name: 'notifications',
      },
      {
        path: 'portfolio',
        component: Portfolio,
        meta: { requiredRole: ['SALES'] },
        name: 'portfolio',
      },
      {
        path: 'commissions',
        component: Commissions,
        meta: { requiredRole: ['SALES'] },
        name: 'commissions',
      },
      {
        path: 'settings',
        component: Settings,
        meta: { requiredRole: ['ADMIN'] },
        name: 'settings',
      },
    ],
  },
  // Auth routes
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        component: Login,
      },
      {
        path: 'register',
        component: Register,
      },
    ],
  },
  // Alias for convenience
  {
    path: '/login',
    redirect: '/auth/login',
  },
  {
    path: '/register',
    redirect: '/auth/register',
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route guard for role-based access
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Ensure auth state is loaded
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  const requiredRoles = to.meta.requiredRole as UserRole[] | undefined

  // Auth routes (login, register) - redirect authenticated users to dashboard
  if (to.path.startsWith('/auth/') || to.path === '/login' || to.path === '/register') {
    if (authStore.user) {
      next('/')
    } else {
      next()
    }
    return
  }

  // Public routes
  if (!requiredRoles) {
    next()
    return
  }

  // Check if user is authenticated
  if (!authStore.user) {
    next('/login')
    return
  }

  // Check role
  const userRole = authStore.userRole as UserRole | undefined
  if (userRole && requiredRoles.includes(userRole)) {
    next()
  } else {
    next('/auth/login')
  }
})

export default router
