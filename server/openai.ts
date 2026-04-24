import OpenAI from 'openai'
import type { QuickAction, RoomProfile } from '../src/types/index.js'

// Lazy-initialized so missing API key doesn't crash server startup
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

const SCENE_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

interface SceneBriefAIResult {
  normalizedIntent: string
  renderPrompt: string
}

export async function interpretSceneBrief(
  room: RoomProfile,
  action: QuickAction,
  refinementText: string,
  collectionName: string,
): Promise<SceneBriefAIResult> {
  const userContent = [
    `Room: ${room.name}`,
    `Placement action: ${action.label} (zone: ${action.zone})`,
    `User refinement: ${refinementText || '(none)'}`,
    `Collection: ${collectionName}`,
  ].join('\n')

  const response = await getClient().chat.completions.create({
    model: SCENE_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an interior design assistant for a furniture visualizer.
Given a room, a furniture placement action, and optional refinement text, respond with a JSON object containing exactly two fields:
- "normalizedIntent": One clear sentence describing what the user wants, incorporating any refinement.
- "renderPrompt": A detailed photorealistic image-generation prompt for gpt-image-2. Describe the room type, furniture placement position, lighting, style, and photography angle. Do not use brand names. Aim for editorial interior photography quality.`,
      },
      { role: 'user', content: userContent },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<SceneBriefAIResult>

  return {
    normalizedIntent: parsed.normalizedIntent ?? `${action.label} in ${room.name}.`,
    renderPrompt: parsed.renderPrompt ?? `${room.name} interior with a side cabinet ${action.zone.toLowerCase()}, natural light, editorial photography.`,
  }
}
