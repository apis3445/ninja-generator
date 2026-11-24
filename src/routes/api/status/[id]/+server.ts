import { json, error } from '@sveltejs/kit'
import { getNinjaStatus as meshyStatus, getNinjaRigStatus } from '$lib/meshyApi'
import { getNinjaStatus as tripoStatus } from '$lib/tripoApi'

export async function GET({ params, url }: { params: { id: string }; url: URL }) {
  const provider = url.searchParams.get('provider') ?? 'tripo'
  const type = url.searchParams.get('type') ?? 'image-to-3d'

  try {
    if (type === 'rigging') {
      if (provider === 'tripo') {
        const data = await tripoStatus(params.id)
        return json(data)
      }
      const data = await getNinjaRigStatus(params.id)
      return json({
        status: (data.status as string).toUpperCase(),
        progress: data.progress ?? 0,
        model_urls: { glb: data.result?.rigged_character_glb_url ?? null }
      })
    }

    if (provider === 'meshy') {
      const data = await meshyStatus(params.id, type as 'text-to-3d' | 'image-to-3d')
      return json({
        status: data.status,
        progress: data.progress ?? 0,
        model_urls: data.model_urls
      })
    }

    const data = await tripoStatus(params.id)
    return json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/status]', message)
    throw error(500, message)
  }
}
