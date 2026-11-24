import { json, error } from '@sveltejs/kit'
import { buildNinjaPrompt } from '$lib/ninjaPrompt'
import { createNinja, uploadImage, createImageNinja } from '$lib/tripoApi'
import type { NinjaAnswers } from '$lib/ninjaPrompt'

export async function POST({ request }: { request: Request }) {
  const { answers, imageUrl } = await request.json() as { answers: NinjaAnswers; imageUrl?: string }

  const prompt = buildNinjaPrompt(answers)

  try {
    let taskId = ''
    if (imageUrl) {
      const imageToken = await uploadImage(imageUrl)
      taskId = await createImageNinja(imageToken)
    } else {
      taskId = await createNinja(prompt)
    }

    return json({ taskId, prompt, isImageTo3D: !!imageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw error(500, message)
  }
}
