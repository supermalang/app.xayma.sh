/**
 * n8n webhook wrappers
 * ALL async operations (deployments, payments, notifications) go through n8n
 * Never call n8n URLs directly from components — always use these wrappers
 *
 * Features:
 * - Typed payloads for each webhook
 * - Automatic retry on 5xx errors (up to 3 attempts)
 * - Normalized error handling
 */

const baseUrl = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

if (!baseUrl) {
  console.warn('VITE_N8N_WEBHOOK_BASE_URL not configured')
}

interface WebhookPayload {
  [key: string]: unknown
}

export class N8nError extends Error {
  constructor(
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(`n8n error: ${statusCode || 'unknown'}`)
  }
}

/**
 * Fire-and-forget webhook call with retry logic
 * Retries automatically on 5xx errors (server errors)
 * Does NOT retry on 4xx errors (client errors)
 */
export async function callN8nWebhook(
  path: string,
  payload: WebhookPayload,
  retryCount = 0
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    // 2xx success
    if (response.ok) {
      return
    }

    // 4xx client errors — do not retry
    if (response.status >= 400 && response.status < 500) {
      const errorText = await response.text()
      console.error(`n8n client error (${response.status}):`, errorText)
      throw new N8nError(response.status, errorText)
    }

    // 5xx server errors — retry
    if (response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        console.warn(
          `n8n server error (${response.status}), retrying (${retryCount + 1}/${MAX_RETRIES})...`
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        return callN8nWebhook(path, payload, retryCount + 1)
      }

      const errorText = await response.text()
      console.error(`n8n server error (${response.status}) after ${MAX_RETRIES} retries:`, errorText)
      throw new N8nError(response.status, errorText)
    }

    // Other status codes
    const errorText = await response.text()
    throw new N8nError(response.status, errorText)
  } catch (error) {
    // Re-throw N8nError as-is
    if (error instanceof N8nError) {
      throw error
    }

    // Network errors, JSON errors, etc.
    console.error('n8n webhook error:', error)
    throw new N8nError(undefined, error)
  }
}

/**
 * Deployment webhook payloads (typed)
 */
interface CreateDeploymentPayload extends WebhookPayload {
  deploymentId: number
  partnerId: number
  serviceId: number
  servicePlanId: number
  serviceVersion: string
  domainNames: string[]
  label: string
  controlNodeId?: number
  deploymentPlan?: string
}

interface DeploymentActionPayload extends WebhookPayload {
  deploymentId: number
  action: 'stop' | 'start' | 'restart'
}

interface TerminateDeploymentPayload extends WebhookPayload {
  deploymentId: number
}

/**
 * Create a new deployment on a control node
 * Payload sent to n8n webhook for AWX integration
 */
export async function createDeployment(payload: CreateDeploymentPayload): Promise<void> {
  await callN8nWebhook('/webhook/create-deployment', payload)
}

/**
 * Perform an action on a deployment (stop, start, restart)
 */
export async function performDeploymentAction(payload: DeploymentActionPayload): Promise<void> {
  await callN8nWebhook('/webhook/deployment-action', payload)
}

/**
 * Terminate a deployment completely
 */
export async function terminateDeployment(payload: TerminateDeploymentPayload): Promise<void> {
  await callN8nWebhook('/webhook/terminate-deployment', payload)
}

/**
 * Legacy deployment webhook (backward compatibility)
 */
export async function deployOdoo(deploymentId: string, config: Record<string, unknown>): Promise<void> {
  await callN8nWebhook('/webhook/deploy-odoo', {
    deploymentId,
    ...config,
  })
}

/**
 * Credit webhooks
 */
export async function processTopup(partnerId: string, bundleId: string): Promise<void> {
  await callN8nWebhook('/webhook/process-topup', {
    partnerId,
    bundleId,
  })
}

interface InitiateCheckoutPayload extends WebhookPayload {
  bundleId: string
  partnerId: string
}

interface InitiateCheckoutResponse {
  paymentUrl: string
  transactionId: string
  reference: string
}

/**
 * Initiate Paytech payment checkout
 * Returns payment URL and transaction ID
 */
export async function initiateCheckout(payload: InitiateCheckoutPayload): Promise<InitiateCheckoutResponse> {
  try {
    const response = await fetch(`${baseUrl}/webhook/initiate-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new N8nError(response.status, await response.text())
    }

    return await response.json()
  } catch (error) {
    if (error instanceof N8nError) {
      throw error
    }
    console.error('n8n checkout error:', error)
    throw new N8nError(undefined, error)
  }
}

export async function handlePaymentCallback(reference: string, status: string): Promise<void> {
  await callN8nWebhook('/webhook/payment-callback', {
    reference,
    status,
  })
}

/**
 * Voucher webhooks
 */
interface RedeemVoucherPayload extends WebhookPayload {
  voucherCode: string
  partnerId: string
}

export async function redeemVoucher(payload: RedeemVoucherPayload): Promise<void> {
  await callN8nWebhook('/webhook/redeem-voucher', payload)
}

/**
 * Notification webhooks
 */
export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  await callN8nWebhook('/webhook/send-notification', {
    userId,
    type,
    title,
    message,
  })
}
