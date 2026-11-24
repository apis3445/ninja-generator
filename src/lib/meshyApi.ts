import { env } from '$env/dynamic/private'

const MESHY_BASE = 'https://api.meshy.ai'

function headers() {
  return {
    'Authorization': `Bearer ${env.MESHY_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

export async function createNinja(prompt: string): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/v2/text-to-3d`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      negative_prompt: 'low quality, low poly, cartoon, flat, 2d',
      pose_mode: 'a-pose'
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy create error: ${res.status} ${res.statusText} — ${body}`)
  }
  const { result } = await res.json()
  return result
}

export async function refineNinja(previewTaskId: string): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/v2/text-to-3d`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ mode: 'refine', preview_task_id: previewTaskId })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy refine error: ${res.status} ${res.statusText} — ${body}`)
  }
  const { result } = await res.json()
  return result
}

export async function createImageNinja(imageUrl: string): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/openapi/v1/image-to-3d`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      image_url: imageUrl,
      model_type: 'standard',
      should_texture: true,
      should_remesh: true,
      target_polycount: 150000
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy image-to-3d error: ${res.status} ${res.statusText} — ${body}`)
  }
  const { result } = await res.json()
  return result
}

export async function createNinjaRig(taskId: string): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/openapi/v1/rigging`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ input_task_id: taskId })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy rig error: ${res.status} ${res.statusText} — ${body}`)
  }
  const data = await res.json()
  return data.result
}

export async function getNinjaRigStatus(rigTaskId: string) {
  const res = await fetch(`${MESHY_BASE}/openapi/v1/rigging/${rigTaskId}`, {
    headers: headers()
  })

  if (!res.ok) throw new Error(`Meshy rig status error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data
}

export async function getNinjaStatus(taskId: string, type: 'text-to-3d' | 'image-to-3d' = 'text-to-3d') {
  const endpoint = type === 'image-to-3d'
    ? `${MESHY_BASE}/openapi/v1/image-to-3d/${taskId}`
    : `${MESHY_BASE}/v2/text-to-3d/${taskId}`

  const res = await fetch(endpoint, { headers: headers() })

  if (!res.ok) throw new Error(`Meshy status error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data
}
