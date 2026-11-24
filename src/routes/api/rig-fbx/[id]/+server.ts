import { json, error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi'

export async function POST({ params }: { params: { id: string } }) {
  // Minimal body — out_format fbx only, no extra fields that may conflict
  const body = {
    type: 'animate_rig',
    original_model_task_id: params.id,
    out_format: 'fbx',
    spec: 'mixamo'
  }

  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.TRIPO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const raw = await res.text()

  if (!res.ok) {
    throw error(500, `Tripo FBX rig error: ${res.status} — ${raw}`)
  }

  let data: any
  try { data = JSON.parse(raw) } catch { throw error(500, 'Tripo returned non-JSON response') }

  if (data.code !== 0) throw error(500, `Tripo error: ${data.message}`)

  const taskId = data.data?.task_id
  if (!taskId) throw error(500, 'Tripo returned no task_id')

  return json({ fbxTaskId: taskId })
}
