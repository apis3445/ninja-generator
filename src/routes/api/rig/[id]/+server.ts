import { json, error } from '@sveltejs/kit'
import { rigNinja } from '$lib/tripoApi'

export async function POST({ params }: { params: { id: string } }) {
  try {
    const rigTaskId = await rigNinja(params.id)
    return json({ rigTaskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/rig] FAILED:', message)
    throw error(500, message)
  }
}
