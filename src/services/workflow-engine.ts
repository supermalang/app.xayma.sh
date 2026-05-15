/**
 * Engine webhook wrappers
 * ALL async operations (deployments, payments, notifications, containers) go through one of
 * the engines configured in Admin → Settings. Never call engine URLs directly from components.
 *
 * Three engines are supported, each backed by its own admin-saved URL + API key pair:
 *   - workflow   → WORKFLOW_ENGINE_URL   / WORKFLOW_ENGINE_API_KEY
 *   - deployment → DEPLOYMENT_ENGINE_URL / DEPLOYMENT_ENGINE_API_KEY
 *   - container  → K8S_CLUSTER_ENDPOINT  / K8S_MANAGEMENT_SECRET
 *
 * Each call appends `?operation=<name>` and authenticates via Bearer token.
 *
 * Features:
 * - Typed payloads for each operation
 * - Automatic retry on 5xx errors (up to 3 attempts)
 * - Normalized error handling
 */

import { getSetting } from './settings'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface WebhookPayload {
  [key: string]: unknown
}

export type Engine = 'workflow' | 'deployment' | 'container'

const ENGINE_CONFIG: Record<Engine, { urlKey: string; tokenKey: string; label: string }> = {
  workflow:   { urlKey: 'WORKFLOW_ENGINE_URL',   tokenKey: 'WORKFLOW_ENGINE_API_KEY',   label: 'Workflow' },
  deployment: { urlKey: 'DEPLOYMENT_ENGINE_URL', tokenKey: 'DEPLOYMENT_ENGINE_API_KEY', label: 'Deployment' },
  container:  { urlKey: 'K8S_CLUSTER_ENDPOINT',  tokenKey: 'K8S_MANAGEMENT_SECRET',     label: 'Container' },
}

export class WorkflowEngineError extends Error {
  constructor(
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(`workflow engine error: ${statusCode || 'unknown'}`)
  }
}

async function getEngineConfig(engine: Engine): Promise<{ url: string; token: string }> {
  const cfg = ENGINE_CONFIG[engine]
  const [rawUrl, rawToken] = await Promise.all([
    getSetting(cfg.urlKey),
    getSetting(cfg.tokenKey),
  ])
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!url) {
    throw new WorkflowEngineError(undefined, `${cfg.label} engine URL (${cfg.urlKey}) not configured`)
  }
  if (!token) {
    throw new WorkflowEngineError(undefined, `${cfg.label} engine token (${cfg.tokenKey}) not configured`)
  }
  return { url, token }
}

function buildOperationUrl(base: string, operation: string): string {
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}operation=${encodeURIComponent(operation)}`
}

/**
 * Internal engine call with optional JSON response parsing.
 * Retries on 5xx, throws on 4xx.
 */
async function callEngineInternal<T = void>(
  engine: Engine,
  operation: string,
  payload: WebhookPayload,
  parseResponse = false,
  retryCount = 0
): Promise<T> {
  try {
    const { url, token } = await getEngineConfig(engine)
    const target = buildOperationUrl(url, operation)

    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
      console.error(`${engine} engine client error (${response.status}):`, errorText)
      throw new WorkflowEngineError(response.status, errorText)
    }

    // 5xx server errors — retry
    if (response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        console.warn(
          `${engine} engine server error (${response.status}), retrying (${retryCount + 1}/${MAX_RETRIES})...`
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        return callEngineInternal<T>(engine, operation, payload, parseResponse, retryCount + 1)
      }

      const errorText = await response.text()
      console.error(`${engine} engine server error (${response.status}) after ${MAX_RETRIES} retries:`, errorText)
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
    console.error(`${engine} engine webhook error:`, error)
    throw new WorkflowEngineError(undefined, error)
  }
}

/**
 * Fire-and-forget webhook call against the workflow engine.
 * Retries automatically on 5xx errors. Does NOT retry on 4xx errors.
 */
export async function callWorkflowEngineWebhook(
  operation: string,
  payload: WebhookPayload
): Promise<void> {
  return callEngineInternal<void>('workflow', operation, payload, false)
}

async function callWorkflowEngineWebhookWithResponse<T>(
  operation: string,
  payload: WebhookPayload
): Promise<T> {
  return callEngineInternal<T>('workflow', operation, payload, true)
}

/** Fire-and-forget webhook call against the deployment engine. */
export async function callDeploymentEngineWebhook(
  operation: string,
  payload: WebhookPayload
): Promise<void> {
  return callEngineInternal<void>('deployment', operation, payload, false)
}

/** Fire-and-forget webhook call against the container engine. */
export async function callContainerEngineWebhook(
  operation: string,
  payload: WebhookPayload
): Promise<void> {
  return callEngineInternal<void>('container', operation, payload, false)
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
  await callDeploymentEngineWebhook('createDeployment', payload)
}

/**
 * Perform an action on a deployment (stop, start, restart)
 */
export async function performDeploymentAction(payload: DeploymentActionPayload): Promise<void> {
  await callDeploymentEngineWebhook('deploymentAction', payload)
}

/**
 * Terminate a deployment completely
 */
export async function terminateDeployment(payload: TerminateDeploymentPayload): Promise<void> {
  await callDeploymentEngineWebhook('terminateDeployment', payload)
}

/**
 * Legacy deployment webhook (backward compatibility)
 */
export async function deployOdoo(deploymentId: string, config: Record<string, unknown>): Promise<void> {
  await callDeploymentEngineWebhook('deployOdoo', {
    deploymentId,
    ...config,
  })
}

/**
 * Credit webhooks
 */
export async function processTopup(partnerId: string, bundleId: string): Promise<void> {
  await callWorkflowEngineWebhook('processTopup', {
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

interface InitiateCheckoutEnvelope {
  status: string
  platform: string
  operation: string
  success: boolean
  results: {
    SUCCESS: boolean
    PAYMENT_URL: string
    TRANSACTION_ID: number | string
    REFERENCE: string
    TOKEN?: string
    CREDITS?: number
    AMOUNT?: number
    LABEL?: string
  }
}

/**
 * Initiate payment gateway checkout
 * Returns payment URL and transaction ID
 * Includes retry logic for transient 5xx errors
 *
 * The workflow engine returns a standard envelope ({ status, platform, operation, results, success }).
 * We unwrap it here so callers consume a clean { paymentUrl, transactionId, reference }.
 */
export async function initiateCheckout(payload: InitiateCheckoutPayload): Promise<InitiateCheckoutResponse> {
  const envelope = await callWorkflowEngineWebhookWithResponse<InitiateCheckoutEnvelope>(
    'initiateCheckout',
    payload
  )

  if (!envelope.success || !envelope.results?.SUCCESS || !envelope.results.PAYMENT_URL) {
    throw new WorkflowEngineError(undefined, envelope)
  }

  return {
    paymentUrl: envelope.results.PAYMENT_URL,
    transactionId: String(envelope.results.TRANSACTION_ID),
    reference: envelope.results.REFERENCE,
  }
}

export async function handlePaymentCallback(reference: string, status: string): Promise<void> {
  await callWorkflowEngineWebhook('paymentCallback', {
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
  await callWorkflowEngineWebhook('redeemVoucher', payload)
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
    const response = await fetch(buildOperationUrl(u, 'test'), {
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
  await callWorkflowEngineWebhook('sendNotification', {
    userId,
    type,
    title,
    message,
  })
}
