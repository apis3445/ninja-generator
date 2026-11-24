import { env } from '$env/dynamic/private'

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations'

function callOpenAI(model: string, prompt: string) {
  const body: Record<string, unknown> = {
    model,
    prompt,
    size: '1024x1024',
    n: 1,
    quality: 'medium' // low/medium/high — medium keeps credit cost down
  }

  return fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  })
}

export function hasOpenAIKey(): boolean {
  return Boolean(env.OPENAI_API_KEY)
}

// Returns the generated image as a data URL.
export async function generateImageOpenAI(prompt: string): Promise<string> {
  let response = await callOpenAI('gpt-image-2', prompt)

  if (!response.ok) {
    // Newest model may not be enabled for every account — fall back to gpt-image-1
    response = await callOpenAI('gpt-image-1', prompt)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`OpenAI image API error: ${response.status} ${response.statusText} — ${body}`)
    }
  }

  const data = await response.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('No image returned in OpenAI response: ' + JSON.stringify(data))
  }

  return `data:image/png;base64,${b64}`
}
