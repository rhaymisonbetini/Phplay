<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps<{
  code?: string
  lastError?: string
}>()

// Provider state
const provider = ref<'anthropic' | 'openai'>('anthropic')

// Anthropic key
const anthropicKey = ref('')
const showAnthropicKey = ref(false)
const savingAnthropicKey = ref(false)
const anthropicKeySaved = ref(false)

// OpenAI key
const openaiKey = ref('')
const showOpenAiKey = ref(false)
const savingOpenAiKey = ref(false)
const openaiKeySaved = ref(false)

// Chat state
const prompt = ref('')
const response = ref('')
const streaming = ref(false)
const error = ref('')
const responseEl = ref<HTMLElement | null>(null)

const SYSTEM_PROMPT = `You are an expert PHP developer assistant inside a PHP REPL called Phplay.
Be concise. Use markdown. Focus on the code provided by the user.
When suggesting code fixes, show the corrected PHP code in a fenced code block.`

const TEMPLATES = [
  { label: 'Explain code', icon: '?', template: 'Explain what this PHP code does, step by step:\n\n```php\n{{code}}\n```' },
  { label: 'Fix error',    icon: '!', template: 'This PHP code produced an error. Fix it:\n\n```php\n{{code}}\n```\n\nError:\n```\n{{error}}\n```' },
  { label: 'Refactor',     icon: '↻', template: 'Refactor this PHP code to be cleaner and more idiomatic:\n\n```php\n{{code}}\n```' },
  { label: 'Optimize',     icon: '⚡', template: 'Suggest performance optimizations for this PHP code:\n\n```php\n{{code}}\n```' },
]

let cleanupChunk: (() => void) | null = null
let cleanupDone: (() => void) | null = null
let cleanupError: (() => void) | null = null

onMounted(async () => {
  const [ak, ok, prov] = await Promise.all([
    window.electronAPI.aiGetKey(),
    window.electronAPI.aiGetOpenAiKey(),
    window.electronAPI.aiGetProvider()
  ])
  anthropicKey.value = ak
  openaiKey.value = ok
  provider.value = prov
})

onBeforeUnmount(() => {
  cleanupChunk?.()
  cleanupDone?.()
  cleanupError?.()
})

async function switchProvider(p: 'anthropic' | 'openai'): Promise<void> {
  provider.value = p
  await window.electronAPI.aiSetProvider(p)
}

async function saveAnthropicKey(): Promise<void> {
  savingAnthropicKey.value = true
  await window.electronAPI.aiSetKey(anthropicKey.value.trim())
  savingAnthropicKey.value = false
  anthropicKeySaved.value = true
  setTimeout(() => { anthropicKeySaved.value = false }, 2000)
}

async function saveOpenAiKey(): Promise<void> {
  savingOpenAiKey.value = true
  await window.electronAPI.aiSetOpenAiKey(openaiKey.value.trim())
  savingOpenAiKey.value = false
  openaiKeySaved.value = true
  setTimeout(() => { openaiKeySaved.value = false }, 2000)
}

function applyTemplate(tpl: string): void {
  prompt.value = tpl
    .replace('{{code}}', props.code ?? '')
    .replace('{{error}}', props.lastError ?? '(no error)')
}

async function send(): Promise<void> {
  const text = prompt.value.trim()
  if (!text || streaming.value) return

  streaming.value = true
  error.value = ''
  response.value = ''
  prompt.value = ''

  cleanupChunk?.()
  cleanupDone?.()
  cleanupError?.()

  cleanupChunk = window.electronAPI.onAiChunk(({ text: chunk }) => {
    response.value += chunk
    nextTick(() => {
      if (responseEl.value) responseEl.value.scrollTop = responseEl.value.scrollHeight
    })
  })

  cleanupDone = window.electronAPI.onAiDone(() => {
    streaming.value = false
    cleanupChunk?.(); cleanupDone?.(); cleanupError?.()
    cleanupChunk = cleanupDone = cleanupError = null
  })

  cleanupError = window.electronAPI.onAiError(({ message }) => {
    error.value = message
    streaming.value = false
    cleanupChunk?.(); cleanupDone?.(); cleanupError?.()
    cleanupChunk = cleanupDone = cleanupError = null
  })

  const result = await window.electronAPI.aiChat(
    [{ role: 'user', content: text }],
    SYSTEM_PROMPT
  ) as { ok: boolean; error?: { message: string } }

  if (!result.ok) {
    error.value = result.error?.message ?? 'Unknown error'
    streaming.value = false
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="ai-sidebar">
    <!-- Provider selector -->
    <div class="provider-tabs">
      <button
        class="provider-tab"
        :class="{ active: provider === 'anthropic' }"
        @click="switchProvider('anthropic')"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" stroke="none">
          <path d="M9.8 2L14 14h-2.4l-.9-2.7H5.3L4.4 14H2L6.2 2h3.6zm-1.8 2.8L6.1 9.6h3.8L8 4.8z" />
        </svg>
        Claude
      </button>
      <button
        class="provider-tab"
        :class="{ active: provider === 'openai' }"
        @click="switchProvider('openai')"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" stroke="none">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3z" />
        </svg>
        GPT
      </button>
    </div>

    <!-- Anthropic API Key -->
    <div v-if="provider === 'anthropic'" class="key-section">
      <p class="section-label">Anthropic API Key</p>
      <div class="key-input-row">
        <input
          v-model="anthropicKey"
          :type="showAnthropicKey ? 'text' : 'password'"
          class="key-input"
          placeholder="sk-ant-…"
          spellcheck="false"
        />
        <button class="icon-btn" :title="showAnthropicKey ? 'Hide' : 'Show'" @click="showAnthropicKey = !showAnthropicKey">
          <svg v-if="showAnthropicKey" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />
            <path d="M2 2l12 12" />
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />
          </svg>
        </button>
        <button class="save-btn" :disabled="savingAnthropicKey" @click="saveAnthropicKey">
          {{ anthropicKeySaved ? '✓' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- OpenAI API Key -->
    <div v-else class="key-section">
      <p class="section-label">OpenAI API Key</p>
      <div class="key-input-row">
        <input
          v-model="openaiKey"
          :type="showOpenAiKey ? 'text' : 'password'"
          class="key-input"
          placeholder="sk-…"
          spellcheck="false"
        />
        <button class="icon-btn" :title="showOpenAiKey ? 'Hide' : 'Show'" @click="showOpenAiKey = !showOpenAiKey">
          <svg v-if="showOpenAiKey" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />
            <path d="M2 2l12 12" />
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" />
          </svg>
        </button>
        <button class="save-btn" :disabled="savingOpenAiKey" @click="saveOpenAiKey">
          {{ openaiKeySaved ? '✓' : 'Save' }}
        </button>
      </div>
      <p class="model-hint">Model: gpt-4o-mini</p>
    </div>

    <!-- Quick actions -->
    <div class="quick-actions">
      <button
        v-for="tpl in TEMPLATES"
        :key="tpl.label"
        class="quick-btn"
        :disabled="streaming"
        @click="applyTemplate(tpl.template)"
      >
        <span class="quick-icon">{{ tpl.icon }}</span>
        {{ tpl.label }}
      </button>
    </div>

    <!-- Prompt input -->
    <div class="prompt-section">
      <textarea
        v-model="prompt"
        class="prompt-input"
        placeholder="Ask anything about your PHP code… (Ctrl+Enter to send)"
        rows="4"
        spellcheck="false"
        @keydown="onKeydown"
      />
      <button class="send-btn" :disabled="streaming || !prompt.trim()" @click="send">
        <span v-if="streaming" class="spinner" />
        <span v-else>Send</span>
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Response -->
    <div v-if="response || streaming" ref="responseEl" class="response-area">
      <pre class="response-text">{{ response }}<span v-if="streaming" class="cursor-blink">▋</span></pre>
    </div>
  </div>
</template>

<style scoped>
.ai-sidebar { display: flex; flex-direction: column; height: 100%; overflow: hidden; gap: 0; }

/* Provider tabs */
.provider-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
  padding: 6px 8px 0;
  gap: 2px;
}
.provider-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-disabled);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
  margin-bottom: -1px;
}
.provider-tab:hover { color: var(--text-muted); }
.provider-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* Key section */
.key-section { padding: 8px; border-bottom: 1px solid var(--border-subtle); }
.section-label { font-size: 0.68rem; color: var(--text-disabled); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
.model-hint { font-size: 0.65rem; color: var(--text-disabled); margin-top: 5px; }

.key-input-row { display: flex; gap: 4px; }
.key-input {
  flex: 1;
  min-width: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.72rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 3px 6px;
  outline: none;
}
.key-input:focus { border-color: var(--accent); }

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.icon-btn:hover { color: var(--text-primary); }

.save-btn {
  padding: 2px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.72rem;
  cursor: pointer;
  flex-shrink: 0;
}
.save-btn:hover { border-color: var(--accent); color: var(--accent); }
.save-btn:disabled { opacity: 0.5; cursor: default; }

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--border-subtle);
}
.quick-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-muted);
  font-size: 0.72rem;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}
.quick-btn:hover { border-color: var(--accent); color: var(--accent); }
.quick-btn:disabled { opacity: 0.4; cursor: default; }
.quick-icon { font-size: 0.8rem; }

.prompt-section { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-bottom: 1px solid var(--border-subtle); }
.prompt-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-family: inherit;
  padding: 6px 8px;
  resize: none;
  outline: none;
  line-height: 1.5;
}
.prompt-input:focus { border-color: var(--accent); }
.prompt-input::placeholder { color: var(--text-disabled); }

.send-btn {
  align-self: flex-end;
  padding: 4px 14px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
}
.send-btn:hover { background: color-mix(in srgb, var(--accent) 20%, transparent); }
.send-btn:disabled { opacity: 0.4; cursor: default; }

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-banner {
  margin: 6px 8px 0;
  padding: 6px 8px;
  border: 1px solid #FF5555;
  border-radius: var(--radius-sm);
  background: rgba(255,85,85,0.08);
  color: #FF5555;
  font-size: 0.72rem;
  word-break: break-word;
}

.response-area { flex: 1; overflow-y: auto; padding: 8px; }
.response-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}
.cursor-blink { animation: blink 1s step-end infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
