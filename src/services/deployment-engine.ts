import { getDeploymentEngineUrl } from './settings'

let deploymentEngineUrl = ''

// Load URL on app startup
export const initDeploymentEngine = async () => {
  deploymentEngineUrl = await getDeploymentEngineUrl()
}

/**
 * Trigger provisioning of a new customer instance.
 * Fire-and-forget. Status tracked via Supabase Realtime (deployment_status table).
 */
export const provisionInstance = async (payload: {
  serverId: string
  instanceConfig: any
}) => {
  if (!deploymentEngineUrl) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl}/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Trigger update of an existing customer instance.
 * Fire-and-forget. Status tracked via Supabase Realtime.
 */
export const updateInstance = async (payload: {
  serverId: string
  updates: any
}) => {
  if (!deploymentEngineUrl) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Trigger deletion of a customer instance.
 * Fire-and-forget. Status tracked via Supabase Realtime.
 */
export const deleteInstance = async (payload: { serverId: string }) => {
  if (!deploymentEngineUrl) {
    throw new Error('Deployment engine URL not configured')
  }

  const response = await fetch(`${deploymentEngineUrl}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Deployment engine error: ${response.statusText}`)
  }

  return response.json()
}
