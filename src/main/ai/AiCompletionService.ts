import { ClaudeClient } from './ClaudeClient'
import { GptClient } from './GptClient'
import type { AiMessage } from './ClaudeClient'

export interface CompletionRequest {
  textBeforeCursor: string
  textAfterCursor: string
  language: string
  cursorPosition: { lineNumber: number; column: number }
}

export interface ProjectContext {
  framework?: 'laravel' | 'symfony' | 'wordpress' | 'plain'
  phpVersion?: string
  projectPath?: string
  currentFile?: string
}

type CompletionScenario = 'generate-from-comment' | 'complete-comment' | 'complete-code'

function detectScenario(textBeforeCursor: string): CompletionScenario {
  const lines = textBeforeCursor.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  const prevLine = lines.length >= 2 ? lines[lines.length - 2].trim() : ''

  if ((prevLine.startsWith('//') || prevLine.startsWith('#')) && lastLine === '') {
    return 'generate-from-comment'
  }
  if (lastLine.startsWith('//') || lastLine.startsWith('#') || lastLine.startsWith('*')) {
    return 'complete-comment'
  }
  return 'complete-code'
}

function buildSystemPrompt(scenario: CompletionScenario, ctx: ProjectContext): string {
  const framework = ctx.framework ?? 'plain'
  const phpVersion = ctx.phpVersion ?? '8.x'
  const frameworkNote = framework !== 'plain' ? ` using ${framework}` : ''

  const base = `You are an expert PHP developer${frameworkNote}. PHP version: ${phpVersion}.
Respond ONLY with the code or text to insert — no explanations, no markdown fences, no extra commentary.`

  if (scenario === 'generate-from-comment') {
    return `${base}
The user wrote a comment describing what they want. Generate the PHP code that implements it.`
  }
  if (scenario === 'complete-comment') {
    return `${base}
Complete the PHP comment. Return only the missing text to append to the comment.`
  }
  return `${base}
Complete the PHP code. Return only the code to insert at the cursor.`
}

function buildMessages(
  request: CompletionRequest,
  scenario: CompletionScenario
): AiMessage[] {
  const contextWindow = request.textBeforeCursor.slice(-800)
  const afterWindow = request.textAfterCursor.slice(0, 200)

  let prompt: string
  if (scenario === 'generate-from-comment') {
    prompt = `Generate PHP code for:\n\n${contextWindow}`
  } else {
    prompt = `Complete this PHP:\n\n[BEFORE CURSOR]\n${contextWindow}\n[CURSOR]\n[AFTER CURSOR]\n${afterWindow}`
  }

  return [{ role: 'user', content: prompt }]
}

function streamToPromise(
  client: ClaudeClient | GptClient,
  messages: AiMessage[],
  systemPrompt: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = ''
    client.streamChat(
      messages,
      systemPrompt,
      (chunk) => { text += chunk },
      () => resolve(text.trim()),
      reject
    )
  })
}

export class AiCompletionService {
  async getCompletion(
    request: CompletionRequest,
    ctx: ProjectContext,
    apiKey: string,
    provider: 'anthropic' | 'openai'
  ): Promise<string | null> {
    const scenario = detectScenario(request.textBeforeCursor)
    const systemPrompt = buildSystemPrompt(scenario, ctx)
    const messages = buildMessages(request, scenario)

    const client = provider === 'openai'
      ? new GptClient(apiKey)
      : new ClaudeClient(apiKey)

    return streamToPromise(client, messages, systemPrompt)
  }
}
