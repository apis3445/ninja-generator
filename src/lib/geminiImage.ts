import { env } from '$env/dynamic/private'

// responseModalities only exists on the v1beta API surface — v1 rejects it
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function callGemini(model: string, prompt: string) {
  return fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY!
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE']
      }
    })
  })
}

export function hasGeminiKey(): boolean {
  return Boolean(env.GEMINI_API_KEY)
}

// Returns the generated image as a data URL.
export async function generateImageGemini(prompt: string): Promise<string> {
  let response = await callGemini('gemini-3.1-flash-image', prompt)

  if (!response.ok) {
    // Newer model may not be enabled for every key — fall back to 2.5
    response = await callGemini('gemini-2.5-flash-image', prompt)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Gemini generateContent API error: ${response.status} ${response.statusText} — ${body}`)
    }
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts
  const imagePart = parts?.find((p: any) => p.inlineData)
  if (!imagePart) {
    throw new Error('No image returned in Gemini response: ' + JSON.stringify(data))
  }

  const { mimeType, data: base64Data } = imagePart.inlineData
  return `data:${mimeType};base64,${base64Data}`
}
