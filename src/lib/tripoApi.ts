import { env } from '$env/dynamic/private'

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi'

function headers() {
  return {
    'Authorization': `Bearer ${env.TRIPO_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

export async function createNinja(prompt: string, seed?: number): Promise<string> {
  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'text_to_model', prompt, model_version: 'v3.1-20260211', geometry_quality: 'detailed', ...(seed !== undefined && { seed }) })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tripo create error: ${res.status} ${res.statusText} — ${body}`)
  }

  const json = await res.json()
  if (json.code !== 0) throw new Error(`Tripo error: ${json.message}`)
  return json.data.task_id
}

export async function uploadImage(imageUrl: string): Promise<string> {
  const base64Data = imageUrl.split(',')[1]
  const buffer = Buffer.from(base64Data, 'base64')

  const formData = new FormData()
  const blob = new Blob([buffer], { type: 'image/png' })
  formData.append('file', blob, 'image.png')

  const res = await fetch(`${TRIPO_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.TRIPO_API_KEY}`
    },
    body: formData
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tripo upload error: ${res.status} ${res.statusText} — ${body}`)
  }

  const json = await res.json()
  if (json.code !== 0) throw new Error(`Tripo upload error: ${json.message}`)
  return json.data.image_token
}

export async function createImageNinja(imageToken: string): Promise<string> {
  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'png',
        file_token: imageToken
      },
      model_version: 'v3.1-20260211'
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tripo create error: ${res.status} ${res.statusText} — ${body}`)
  }

  const json = await res.json()
  if (json.code !== 0) throw new Error(`Tripo error: ${json.message}`)
  return json.data.task_id
}

export async function rigNinja(modelTaskId: string): Promise<string> {
  const reqBody = {
    type: 'rig_model',
    original_model_task_id: modelTaskId,
    out_format: 'glb',
    spec: 'mixamo'
  }

  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(reqBody)
  })

  const raw = await res.text()

  if (!res.ok) throw new Error(`Tripo rig error: ${res.status} ${res.statusText} — ${raw}`)

  const data = JSON.parse(raw)
  if (data.code !== 0) throw new Error(`Tripo rig error: ${data.message}`)
  return data.data.task_id
}

export async function getNinjaStatus(taskId: string) {
  const res = await fetch(`${TRIPO_BASE}/task/${taskId}`, { headers: headers() })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Tripo status error: ${res.status} ${res.statusText} — ${body}`)
  }

  const json = await res.json()
  if (json.code !== 0) throw new Error(`Tripo error: ${json.message}`)

  const d = json.data

  const statusMap: Record<string, string> = {
    queued: 'PENDING',
    running: 'PROCESSING',
    success: 'SUCCEEDED',
    failed: 'FAILED',
    cancelled: 'FAILED'
  }

  return {
    status: statusMap[d.status] ?? 'PENDING',
    progress: d.progress ?? 0,
    model_urls: { glb: d.output?.pbr_model ?? d.output?.model ?? null }
  }
}
