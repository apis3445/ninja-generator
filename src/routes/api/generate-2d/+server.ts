import { json, error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { buildNinjaPrompt } from '$lib/ninjaPrompt'
import { generateImageOpenAI, hasOpenAIKey } from '$lib/openaiImage'
import { generateImageGemini, hasGeminiKey } from '$lib/geminiImage'

type ImageEngine = 'openai' | 'gemini'

export async function POST({ request }: { request: Request }) {
  const { answers, engine: requested } = await request.json()
  const prompt = buildNinjaPrompt(answers)

  // Engine priority: request body > IMAGE_ENGINE in .env > 'openai'.
  // If the chosen engine has no API key, fall back to the one that does.
  const preferred = requested ?? env.IMAGE_ENGINE ?? 'openai'
  let engine: ImageEngine = preferred === 'gemini' ? 'gemini' : 'openai'
  if (engine === 'openai' && !hasOpenAIKey() && hasGeminiKey()) engine = 'gemini'
  if (engine === 'gemini' && !hasGeminiKey() && hasOpenAIKey()) engine = 'openai'

  if (!hasOpenAIKey() && !hasGeminiKey()) {
    throw error(500, 'Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured in .env')
  }

  try {
    const imageUrl = engine === 'gemini'
      ? await generateImageGemini(prompt)
      : await generateImageOpenAI(prompt)

    return json({ imageUrl, prompt, engine })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[/api/generate-2d] (${engine})`, message)
    throw error(500, message)
  }
}
