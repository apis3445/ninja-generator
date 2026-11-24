import { json, error } from '@sveltejs/kit'
import { buildNinjaPrompt } from '$lib/ninjaPrompt'
import { createNinja as meshyCreateText, createImageNinja as meshyCreateImage } from '$lib/meshyApi'
import { createNinja as tripoCreateText, uploadImage as tripoUpload, createImageNinja as tripoCreateImage } from '$lib/tripoApi'
import type { NinjaAnswers } from '$lib/ninjaPrompt'

export async function POST({ request }: { request: Request }) {
  const { answers, imageUrl } = await request.json() as { answers: NinjaAnswers; imageUrl?: string }

  const provider = answers.provider ?? 'tripo'
  const prompt = buildNinjaPrompt(answers, provider)

  try {
    let taskId = ''
    if (imageUrl) {
      if (provider === 'meshy') {
        taskId = await meshyCreateImage(imageUrl)
      } else {
        const imageToken = await tripoUpload(imageUrl)
        taskId = await tripoCreateImage(imageToken)
      }
    } else {
      taskId = provider === 'meshy'
        ? await meshyCreateText(prompt)
        : await tripoCreateText(prompt)
    }

    return json({ taskId, prompt, provider, isImageTo3D: !!imageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw error(500, message)
  }
}
