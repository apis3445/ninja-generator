import { json, error } from '@sveltejs/kit'
import { getNinjaStatus } from '$lib/tripoApi'

export async function GET({ params }: { params: { id: string } }) {
  try {
    const data = await getNinjaStatus(params.id)
    return json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/status]', message)
    throw error(500, message)
  }
}
