const baseUrl = import.meta.env.VITE_DEPLOYMENT_ENGINE_BASE_URL

if (!baseUrl) {
  console.warn('VITE_DEPLOYMENT_ENGINE_BASE_URL not configured')
}

interface WebhookPayload {
  [key: string]: unknown
}

export class DeploymentEngineError extends Error {
  constructor(
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(`deployment engine error: ${statusCode || 'unknown'}`)
  }
}

async function callDeploymentEngine(
  endpoint: string,
  payload: WebhookPayload
): Promise<unknown> {
  if (!baseUrl) {
    throw new DeploymentEngineError(undefined, 'Deployment engine URL not configured')
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new DeploymentEngineError(response.status, errorText)
  }

  return response.json()
}

export const provisionInstance = async (payload: {
  serverId: string
  instanceConfig: Record<string, unknown>
}): Promise<unknown> => callDeploymentEngine('/provision', payload)

export const updateInstance = async (payload: {
  serverId: string
  updates: Record<string, unknown>
}): Promise<unknown> => callDeploymentEngine('/update', payload)

export const deleteInstance = async (payload: { serverId: string }): Promise<unknown> =>
  callDeploymentEngine('/delete', payload)
