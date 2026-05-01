/**
 * Workflow engine webhook wrappers
 * ALL async operations (deployments, payments, notifications) go through the workflow engine
 * Never call workflow engine URLs directly from components — always use these wrappers
 *
 * Features:
 * - Typed payloads for each webhook
 * - Automatic retry on 5xx errors (up to 3 attempts)
 * - Normalized error handling
 */

const baseUrl = import.meta.env.VITE_WORKFLOW_ENGINE_BASE_URL
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface WebhookPayload {
  [key: string]: unknown
}

export class WorkflowEngineError extends Error {
  constructor(
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(`workflow engine error: ${statusCode || 'unknown'}`)
  }
}

/**
 * Internal implementation of webhook call with optional JSON response parsing
 * Handles retry logic for 5xx errors, throws on 4xx errors
 */
async function callWorkflowEngineWebhookInternal<T = void>(
  path: string,
  payload: WebhookPayload,
  parseResponse = false,
  retryCount = 0
): Promise<T> {
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
      return (parseResponse ? (await response.json()) : undefined) as T
    }

    // 4xx client errors — do not retry
    if (response.status >= 400 && response.status < 500) {
      const errorText = await response.text()
      console.error(`workflow engine client error (${response.status}):`, errorText)
      throw new WorkflowEngineError(response.status, errorText)
    }

    // 5xx server errors — retry
    if (response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        console.warn(
          `workflow engine server error (${response.status}), retrying (${retryCount + 1}/${MAX_RETRIES})...`
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        return callWorkflowEngineWebhookInternal<T>(path, payload, parseResponse, retryCount + 1)
      }

      const errorText = await response.text()
      console.error(`workflow engine server error (${response.status}) after ${MAX_RETRIES} retries:`, errorText)
      throw new WorkflowEngineError(response.status, errorText)
    }

    // Other status codes
    const errorText = await response.text()
    throw new WorkflowEngineError(response.status, errorText)
  } catch (error) {
    // Re-throw WorkflowEngineError as-is
    if (error instanceof WorkflowEngineError) {
      throw error
    }

    // Network errors, JSON errors, etc.
    console.error('workflow engine webhook error:', error)
    throw new WorkflowEngineError(undefined, error)
  }
}

/**
 * Fire-and-forget webhook call with retry logic
 * Retries automatically on 5xx errors (server errors)
 * Does NOT retry on 4xx errors (client errors)
 */
export async function callWorkflowEngineWebhook(
  path: string,
  payload: WebhookPayload
): Promise<void> {
  return callWorkflowEngineWebhookInternal<void>(path, payload, false)
}

/**
 * Webhook call that returns JSON response
 * Same retry logic as callWorkflowEngineWebhook, but parses and returns JSON on success
 */
async function callWorkflowEngineWebhookWithResponse<T>(
  path: string,
  payload: WebhookPayload
): Promise<T> {
  return callWorkflowEngineWebhookInternal<T>(path, payload, true)
}

/**
 * Deployment webhook payloads (typed)
 */
interface CreateDeploymentPayload extends WebhookPayload {
  deploymentId: number
  partnerId: number
  serviceId: number
  planSlug: string
  serviceVersion?: string
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
 * Payload sent to workflow engine webhook for deployment engine integration
 */
export async function createDeployment(payload: CreateDeploymentPayload): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/create-deployment', payload)
}

/**
 * Perform an action on a deployment (stop, start, restart)
 */
export async function performDeploymentAction(payload: DeploymentActionPayload): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/deployment-action', payload)
}

/**
 * Terminate a deployment completely
 */
export async function terminateDeployment(payload: TerminateDeploymentPayload): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/terminate-deployment', payload)
}

/**
 * Legacy deployment webhook (backward compatibility)
 */
export async function deployOdoo(deploymentId: string, config: Record<string, unknown>): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/deploy-odoo', {
    deploymentId,
    ...config,
  })
}

/**
 * Credit webhooks
 */
export async function processTopup(partnerId: string, bundleId: string): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/process-topup', {
    partnerId,
    bundleId,
  })
}

interface InitiateCheckoutPayload extends WebhookPayload {
  bundleId: string
  partnerId: string
  paymentGatewayId: string
}

interface InitiateCheckoutResponse {
  paymentUrl: string
  transactionId: string
  reference: string
}

/**
 * Initiate payment gateway checkout
 * Returns payment URL and transaction ID
 * Includes retry logic for transient 5xx errors
 */
export async function initiateCheckout(payload: InitiateCheckoutPayload): Promise<InitiateCheckoutResponse> {
  return callWorkflowEngineWebhookWithResponse<InitiateCheckoutResponse>(
    '/webhook/initiate-checkout',
    payload
  )
}

export async function handlePaymentCallback(reference: string, status: string): Promise<void> {
  await callWorkflowEngineWebhook('/webhook/payment-callback', {
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
  await callWorkflowEngineWebhook('/webhook/redeem-voucher', payload)
}

/**
 * POSTs directly to the URL the admin entered with the token as a Bearer header.
 * Success requires HTTP 200 AND a JSON body of `{ success: true }`.
 */
const TEST_CONNECTION_TIMEOUT_MS = 5000

export async function testEngineConnection(
  url: string,
  token: string
): Promise<{ ok: boolean }> {
  const u = url.trim()
  const t = token.trim()
  if (!u || !t) return { ok: false }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TEST_CONNECTION_TIMEOUT_MS)
  try {
    const response = await fetch(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
      },
      body: '{}',
      signal: controller.signal,
    })
    if (response.status !== 200) return { ok: false }
    try {
      const body = (await response.json()) as { success?: unknown }
      return { ok: body?.success === true }
    } catch {
      return { ok: false }
    }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Deployment engine — fetch available job templates.
 * The engine multiplexes operations on a single webhook URL via `?operation=`.
 * Response shape: { success: boolean, results: Array<{ id, url, name, ... }> }
 * Only id, url, name are surfaced to callers — those are what the create-service
 * form persists so a deployment can later be triggered against the right template.
 */
export interface DeploymentTemplate {
  id: number
  url: string
  name: string
}

const FETCH_TEMPLATES_TIMEOUT_MS = 8000

export async function fetchDeploymentTemplates(
  url: string,
  token: string,
): Promise<DeploymentTemplate[]> {
  const u = url.trim()
  const k = token.trim()
  if (!u || !k) return []

  const target = u.includes('?') ? `${u}&operation=getTemplates` : `${u}?operation=getTemplates`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TEMPLATES_TIMEOUT_MS)
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${k}`,
      },
      body: '{}',
      signal: controller.signal,
    })
    if (!response.ok) throw new WorkflowEngineError(response.status)
    const body = (await response.json()) as {
      success?: unknown
      results?: unknown
    }
    if (body?.success !== true || !Array.isArray(body.results)) {
      throw new WorkflowEngineError(response.status)
    }
    return body.results.flatMap((row): DeploymentTemplate[] => {
      if (!row || typeof row !== 'object') return []
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'number' || typeof r.url !== 'string' || typeof r.name !== 'string') {
        return []
      }
      return [{ id: r.id, url: r.url, name: r.name }]
    })
  } finally {
    clearTimeout(timer)
  }
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
  await callWorkflowEngineWebhook('/webhook/send-notification', {
    userId,
    type,
    title,
    message,
  })
}
