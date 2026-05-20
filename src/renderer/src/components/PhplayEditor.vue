<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { phplayDarkTheme } from '../assets/monaco-theme'

window.MonacoEnvironment = {
  getWorker: (_workerId: string, _label: string): Worker => {
    const blob = new Blob(['self.onmessage=function(){}'], { type: 'text/javascript' })
    return new Worker(URL.createObjectURL(blob))
  }
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    language?: string
    readOnly?: boolean
    projectPath?: string | null
    lspReady?: boolean
  }>(),
  {
    modelValue: '<?php\n\n',
    language: 'php',
    readOnly: false,
    projectPath: null,
    lspReady: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  run: []
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let currentUri = ''
let docVersion = 0
let completionDisposable: monaco.IDisposable | null = null
let hoverDisposable: monaco.IDisposable | null = null
let signatureDisposable: monaco.IDisposable | null = null

// ── LSP provider registration ────────────────────────────────────────────────

function disposeProviders(): void {
  completionDisposable?.dispose()
  hoverDisposable?.dispose()
  signatureDisposable?.dispose()
  completionDisposable = null
  hoverDisposable = null
  signatureDisposable = null
}

function registerLspProviders(uri: string): void {
  disposeProviders()

  completionDisposable = monaco.languages.registerCompletionItemProvider('php', {
    triggerCharacters: ['.', ':', '\\', '$', '(', ',', ' '],
    async provideCompletionItems(model, position) {
      if (model.uri.toString() !== uri) return { suggestions: [] }

      const raw = await window.electronAPI.lspCompletion(
        uri,
        position.lineNumber - 1,
        position.column - 1
      )

      if (!raw) return { suggestions: [] }
      const items = (raw as { items?: unknown[] }).items ?? (Array.isArray(raw) ? raw : [])
      return {
        suggestions: (items as LspCompletionItem[]).map((item) => lspItemToMonaco(item, model, position))
      }
    }
  })

  hoverDisposable = monaco.languages.registerHoverProvider('php', {
    async provideHover(model, position) {
      if (model.uri.toString() !== uri) return null

      const raw = await window.electronAPI.lspHover(
        uri,
        position.lineNumber - 1,
        position.column - 1
      )

      if (!raw) return null
      const hover = raw as { contents?: LspMarkupContent[]; range?: LspRange }
      if (!hover.contents?.length) return null

      return {
        contents: hover.contents.map((c) => ({
          value: typeof c === 'string' ? c : c.value ?? ''
        })),
        range: hover.range ? lspRangeToMonaco(hover.range) : undefined
      }
    }
  })

  signatureDisposable = monaco.languages.registerSignatureHelpProvider('php', {
    signatureHelpTriggerCharacters: ['(', ','],
    async provideSignatureHelp(model, position) {
      if (model.uri.toString() !== uri) return null

      const raw = await window.electronAPI.lspSignatureHelp(
        uri,
        position.lineNumber - 1,
        position.column - 1
      )

      if (!raw) return null
      const sh = raw as LspSignatureHelp
      if (!sh.signatures?.length) return null

      return {
        value: {
          signatures: sh.signatures.map((sig) => ({
            label: sig.label,
            documentation: sig.documentation ? { value: sig.documentation.value ?? sig.documentation } : undefined,
            parameters: (sig.parameters ?? []).map((p) => ({
              label: p.label,
              documentation: p.documentation ? { value: p.documentation.value ?? p.documentation } : undefined
            }))
          })),
          activeSignature: sh.activeSignature ?? 0,
          activeParameter: sh.activeParameter ?? 0
        },
        dispose() {}
      }
    }
  })
}

// ── LSP type helpers ─────────────────────────────────────────────────────────

interface LspCompletionItem {
  label: string
  kind?: number
  detail?: string
  documentation?: { kind?: string; value?: string } | string
  insertText?: string
  insertTextFormat?: number // 1=plaintext, 2=snippet
  textEdit?: { newText: string; range: LspRange }
}

interface LspMarkupContent {
  kind?: string
  value?: string
}

interface LspRange {
  start: { line: number; character: number }
  end: { line: number; character: number }
}

interface LspSignatureHelp {
  signatures: Array<{
    label: string
    documentation?: { kind?: string; value?: string } | string
    parameters?: Array<{
      label: string | [number, number]
      documentation?: { kind?: string; value?: string } | string
    }>
  }>
  activeSignature?: number
  activeParameter?: number
}

const LSP_KIND_TO_MONACO: Record<number, monaco.languages.CompletionItemKind> = {
  1: monaco.languages.CompletionItemKind.Text,
  2: monaco.languages.CompletionItemKind.Method,
  3: monaco.languages.CompletionItemKind.Function,
  4: monaco.languages.CompletionItemKind.Constructor,
  5: monaco.languages.CompletionItemKind.Field,
  6: monaco.languages.CompletionItemKind.Variable,
  7: monaco.languages.CompletionItemKind.Class,
  8: monaco.languages.CompletionItemKind.Interface,
  9: monaco.languages.CompletionItemKind.Module,
  10: monaco.languages.CompletionItemKind.Property,
  12: monaco.languages.CompletionItemKind.Value,
  13: monaco.languages.CompletionItemKind.Enum,
  14: monaco.languages.CompletionItemKind.Keyword,
  15: monaco.languages.CompletionItemKind.Snippet,
  16: monaco.languages.CompletionItemKind.Color,
  17: monaco.languages.CompletionItemKind.File,
  18: monaco.languages.CompletionItemKind.Reference,
  21: monaco.languages.CompletionItemKind.Constant,
  22: monaco.languages.CompletionItemKind.Struct,
  23: monaco.languages.CompletionItemKind.Event,
  24: monaco.languages.CompletionItemKind.Operator,
  25: monaco.languages.CompletionItemKind.TypeParameter
}

function lspItemToMonaco(
  item: LspCompletionItem,
  model: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.CompletionItem {
  const word = model.getWordUntilPosition(position)
  const defaultRange: monaco.IRange = {
    startLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  }

  const range = item.textEdit?.range ? lspRangeToMonaco(item.textEdit.range) : defaultRange
  const insertText = item.textEdit?.newText ?? item.insertText ?? item.label
  const isSnippet = item.insertTextFormat === 2

  const doc = typeof item.documentation === 'string'
    ? item.documentation
    : item.documentation?.value ?? ''

  return {
    label: item.label,
    kind: LSP_KIND_TO_MONACO[item.kind ?? 0] ?? monaco.languages.CompletionItemKind.Text,
    detail: item.detail,
    documentation: doc ? { value: doc } : undefined,
    insertText,
    insertTextRules: isSnippet
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range
  }
}

function lspRangeToMonaco(r: LspRange): monaco.IRange {
  return {
    startLineNumber: r.start.line + 1,
    startColumn: r.start.character + 1,
    endLineNumber: r.end.line + 1,
    endColumn: r.end.character + 1
  }
}

// ── Document sync ────────────────────────────────────────────────────────────

async function openDocument(): Promise<void> {
  if (!editor || !props.lspReady) return
  const text = editor.getValue()
  await window.electronAPI.lspDidOpen(currentUri, text, ++docVersion)
}

async function changeDocument(text: string): Promise<void> {
  if (!props.lspReady || !currentUri) return
  await window.electronAPI.lspDidChange(currentUri, text, ++docVersion)
}

// ── Monaco lifecycle ─────────────────────────────────────────────────────────

onMounted(() => {
  if (!editorContainer.value) return

  monaco.editor.defineTheme('phplay-dark', phplayDarkTheme)

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: 'phplay-dark',
    readOnly: props.readOnly,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'line',
    padding: { top: 12, bottom: 12 },
    wordWrap: 'on',
    folding: true,
    tabSize: 4,
    insertSpaces: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: false, strings: false },
    parameterHints: { enabled: true }
  })

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue()
    emit('update:modelValue', value)
    changeDocument(value)
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('run')
  })
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      editor.setValue(newValue)
    }
  }
)

// When projectPath changes, compute new URI and (re-)open the document
watch(
  () => props.projectPath,
  async (newPath) => {
    if (!newPath) return
    currentUri = await window.electronAPI.lspPathToUri(newPath + '/phplay-scratch.php')
    if (props.lspReady) {
      registerLspProviders(currentUri)
      await openDocument()
    }
  }
)

// When LSP becomes ready (after lsp:start completes), register providers
watch(
  () => props.lspReady,
  async (ready) => {
    if (!ready || !currentUri) return
    registerLspProviders(currentUri)
    await openDocument()
  }
)

onBeforeUnmount(async () => {
  if (currentUri && props.lspReady) {
    await window.electronAPI.lspDidClose(currentUri).catch(() => undefined)
  }
  disposeProviders()
  editor?.dispose()
  editor = null
})

defineExpose({
  focus: () => editor?.focus(),
  getValue: () => editor?.getValue() ?? ''
})
</script>

<template>
  <div ref="editorContainer" class="h-full w-full" />
</template>
