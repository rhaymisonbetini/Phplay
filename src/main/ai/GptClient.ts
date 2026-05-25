import https from 'https'
import type { AiMessage, ChunkCallback, DoneCallback, ErrorCallback } from './ClaudeClient'

const API_HOST = 'api.openai.com'
const API_PATH = '/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export class GptClient {
  constructor(private apiKey: string) {}

  streamChat(
    messages: AiMessage[],
    systemPrompt: string,
    onChunk: ChunkCallback,
    onDone: DoneCallback,
    onError: ErrorCallback
  ): void {
    const body = JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    })

    const req = https.request(
      {
        hostname: API_HOST,
        path: API_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = ''
          res.on('data', (c: Buffer) => { errBody += c.toString() })
          res.on('end', () => onError(new Error(`OpenAI error ${res.statusCode}: ${errBody.slice(0, 200)}`)))
          return
        }

        let buf = ''
        res.on('data', (chunk: Buffer) => {
          buf += chunk.toString()
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              const content = event.choices?.[0]?.delta?.content
              if (typeof content === 'string') onChunk(content)
            } catch {
              // skip malformed SSE line
            }
          }
        })
        res.on('end', onDone)
        res.on('error', onError)
      }
    )

    req.on('error', onError)
    req.write(body)
    req.end()
  }
}
