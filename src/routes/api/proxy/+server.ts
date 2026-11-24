import { error } from '@sveltejs/kit'

const ALLOWED_HOSTS = new Set(['tripo-data.rg1.data.tripo3d.com'])

export async function GET({ url }: { url: URL }) {
  const target   = url.searchParams.get('url')
  const download = url.searchParams.get('download') // optional: triggers attachment download

  if (!target) throw error(400, 'Missing url param')

  let parsed: URL
  try { parsed = new URL(target) } catch { throw error(400, 'Invalid url') }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) throw error(403, 'Forbidden')

  const res = await fetch(target)
  if (!res.ok) throw error(502, `Upstream error: ${res.status}`)

  const isFbx = target.toLowerCase().includes('.fbx') || download?.endsWith('.fbx')
  const contentType = isFbx ? 'application/octet-stream' : 'model/gltf-binary'

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400'
  }

  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${download}"`
  }

  return new Response(res.body, { headers })
}
