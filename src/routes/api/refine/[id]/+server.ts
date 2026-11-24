import { json, error } from '@sveltejs/kit'
import { refineNinja } from '$lib/meshyApi'

export async function POST({ params }: { params: { id: string } }) {
  try {
    const taskId = await refineNinja(params.id)
    return json({ taskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/refine]', message)
    throw error(500, message)
  }
}
