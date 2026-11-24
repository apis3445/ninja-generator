import { json, error } from '@sveltejs/kit'
import { createNinjaRig } from '$lib/meshyApi'
import { rigNinja } from '$lib/tripoApi'

export async function POST({ params, url }: { params: { id: string }; url: URL }) {
  const provider = url.searchParams.get('provider') ?? 'meshy'
  try {
    const rigTaskId = provider === 'tripo'
      ? await rigNinja(params.id)
      : await createNinjaRig(params.id)
    return json({ rigTaskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/rig] FAILED:', message)
    throw error(500, message)
  }
}
