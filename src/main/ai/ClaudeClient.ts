import https from 'https'

const API_HOST = 'api.anthropic.com'
const API_PATH = '/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export type ChunkCallback = (text: string) => void
export type DoneCallback = () => void
export type ErrorCallback = (err: Error) => void

export class ClaudeClient {
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
      system: systemPrompt,
      messages,
      stream: true
    })

    const req = https.request(
      {
        hostname: API_HOST,
        path: API_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': this.apiKey,
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = ''
          res.on('data', (c: Buffer) => { errBody += c.toString() })
          res.on('end', () => onError(new Error(`API error ${res.statusCode}: ${errBody.slice(0, 200)}`)))
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
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                onChunk(event.delta.text as string)
              }
            } catch {
              // malformed SSE line — skip
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
