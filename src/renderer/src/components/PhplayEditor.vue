<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { registerCompletion } from 'monacopilot'
import { phplayDarkTheme } from '../assets/monaco-theme'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { registerLaravelCompletionProvider, loadLaravelMeta } from '../composables/useLaravelCompletions'

window.MonacoEnvironment = {
  getWorker: (_workerId: string, _label: string): Worker => new EditorWorker()
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    language?: string
    readOnly?: boolean
    projectPath?: string | null
    lspReady?: boolean
    framework?: string
    selectedPhp?: string
    aiEnabled?: boolean
  }>(),
  {
    modelValue: '<?php\n\n',
    language: 'php',
    readOnly: false,
    projectPath: null,
    lspReady: false,
    framework: 'plain',
    selectedPhp: '',
    aiEnabled: false
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
let laravelCompletionDisposable: monaco.IDisposable | null = null
let definitionDisposable: monaco.IDisposable | null = null
let referencesDisposable: monaco.IDisposable | null = null
let renameDisposable: monaco.IDisposable | null = null
let codeActionDisposable: monaco.IDisposable | null = null
let aiCompletionDisposable: { deregister: () => void } | null = null
let diagnosticsCleanup: (() => void) | null = null

// ── IpcResult unwrap ─────────────────────────────────────────────────────────

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: unknown }

function unwrapIpc<T>(result: unknown): T | null {
  if (result && typeof result === 'object' && 'ok' in result) {
    const r = result as IpcResult<T>
    return r.ok ? r.data : null
  }
  return result as T | null
}

// ── LSP provider registration ────────────────────────────────────────────────

function lspRangeToMonaco(range: { start: { line: number; character: number }; end: { line: number; character: number } }): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1
  }
}

function disposeProviders(): void {
  completionDisposable?.dispose()
  hoverDisposable?.dispose()
  signatureDisposable?.dispose()
  laravelCompletionDisposable?.dispose()
  definitionDisposable?.dispose()
  referencesDisposable?.dispose()
  renameDisposable?.dispose()
  codeActionDisposable?.dispose()
  completionDisposable = null
  hoverDisposable = null
  signatureDisposable = null
  laravelCompletionDisposable = null
  definitionDisposable = null
  referencesDisposable = null
  renameDisposable = null
  codeActionDisposable = null
}

function registerLspProviders(uri: string): void {
  disposeProviders()

  completionDisposable = monaco.languages.registerCompletionItemProvider('php', {
    triggerCharacters: ['.', ':', '\\', '$', '(', ',', ' '],
    async provideCompletionItems(_model, position) {
      if (!uri) return { suggestions: [] }

      const result = await window.electronAPI.lspCompletion(
        uri,
        position.lineNumber - 1,
        position.column - 1
      )

      const raw = unwrapIpc(result)
      if (!raw) return { suggestions: [] }
      const items = (raw as { items?: unknown[] }).items ?? (Array.isArray(raw) ? raw : [])
      return {
        suggestions: (items as LspCompletionItem[]).map((item) => lspItemToMonaco(item, _model, position))
      }
    }
  })

  hoverDisposable = monaco.languages.registerHoverProvider('php', {
    async provideHover(_model, position) {
      if (!uri) return null

      const raw = unwrapIpc(await window.electronAPI.lspHover(
        uri,
        position.lineNumber - 1,
        position.column - 1
      ))

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
    async provideSignatureHelp(_model, position) {
      if (!uri) return null

      const raw = unwrapIpc(await window.electronAPI.lspSignatureHelp(
        uri,
        position.lineNumber - 1,
        position.column - 1
      ))

      if (!raw) return null
      const sh = raw as LspSignatureHelp
      if (!sh.signatures?.length) return null

      return {
        value: {
          signatures: sh.signatures.map((sig) => ({
            label: sig.label,
            documentation: sig.documentation ? { value: typeof sig.documentation === 'string' ? sig.documentation : (sig.documentation.value ?? '') } : undefined,
            parameters: (sig.parameters ?? []).map((p) => ({
              label: p.label,
              documentation: p.documentation ? { value: typeof p.documentation === 'string' ? p.documentation : (p.documentation.value ?? '') } : undefined
            }))
          })),
          activeSignature: sh.activeSignature ?? 0,
          activeParameter: sh.activeParameter ?? 0
        },
        dispose() {}
      }
    }
  })

  definitionDisposable = monaco.languages.registerDefinitionProvider('php', {
    async provideDefinition(_model, position) {
      if (!uri) return null
      const result = await window.electronAPI.lspDefinition(uri, position.lineNumber - 1, position.column - 1)
      if (!result.ok || !result.data?.length) return null
      return result.data.map((loc: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) => ({
        uri: monaco.Uri.parse(loc.uri),
        range: lspRangeToMonaco(loc.range)
      }))
    }
  })

  referencesDisposable = monaco.languages.registerReferenceProvider('php', {
    async provideReferences(_model, position) {
      if (!uri) return null
      const result = await window.electronAPI.lspReferences(uri, position.lineNumber - 1, position.column - 1)
      if (!result.ok || !result.data?.length) return null
      return result.data.map((loc: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) => ({
        uri: monaco.Uri.parse(loc.uri),
        range: lspRangeToMonaco(loc.range)
      }))
    }
  })

  renameDisposable = monaco.languages.registerRenameProvider('php', {
    async provideRenameEdits(_model, position, newName) {
      if (!uri) return null
      const result = await window.electronAPI.lspRename(uri, position.lineNumber - 1, position.column - 1, newName)
      if (!result.ok || !result.data) return null
      const wsEdit = result.data as { changes?: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> }
      if (!wsEdit.changes) return { edits: [] }
      const edits: monaco.languages.IWorkspaceTextEdit[] = []
      for (const [fileUri, fileEdits] of Object.entries(wsEdit.changes)) {
        for (const e of fileEdits) {
          edits.push({
            resource: monaco.Uri.parse(fileUri),
            textEdit: { range: lspRangeToMonaco(e.range), text: e.newText },
            versionId: undefined
          })
        }
      }
      return { edits }
    }
  })

  codeActionDisposable = monaco.languages.registerCodeActionProvider('php', {
    async provideCodeActions(_model, range, context) {
      if (!uri) return null
      const lspDiagnostics = context.markers.map((m) => ({
        range: {
          start: { line: m.startLineNumber - 1, character: m.startColumn - 1 },
          end: { line: m.endLineNumber - 1, character: m.endColumn - 1 }
        },
        message: m.message,
        severity: m.severity === monaco.MarkerSeverity.Error ? 1 : 2
      }))
      const lspRange = {
        start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
        end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
      }
      const result = await window.electronAPI.lspCodeAction(uri, lspRange, lspDiagnostics)
      if (!result.ok || !result.data?.length) return { actions: [], dispose() {} }
      const actions: monaco.languages.CodeAction[] = (result.data as Array<{ title: string; edit?: { changes?: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>> } }>).map((a) => {
        const edits: monaco.languages.IWorkspaceTextEdit[] = []
        if (a.edit?.changes) {
          for (const [fileUri, fileEdits] of Object.entries(a.edit.changes)) {
            for (const e of fileEdits) {
              edits.push({
                resource: monaco.Uri.parse(fileUri),
                textEdit: { range: lspRangeToMonaco(e.range), text: e.newText },
                versionId: undefined
              })
            }
          }
        }
        return { title: a.title, edit: { edits } }
      })
      return { actions, dispose() {} }
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

    // Font
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 14,
    lineHeight: 22,
    fontLigatures: true,
    letterSpacing: 0,

    // Layout
    minimap: { enabled: false },
    lineNumbers: 'on',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    padding: { top: 16, bottom: 16 },
    wordWrap: 'on',
    folding: true,
    tabSize: 4,
    insertSpaces: true,

    // Line appearance
    renderLineHighlight: 'gutter',
    cursorStyle: 'line',
    cursorBlinking: 'smooth',
    cursorWidth: 2,
    cursorSmoothCaretAnimation: 'on',

    // Bracket colorization
    bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },

    // Current line highlight
    renderLineHighlightOnlyWhenFocus: false,

    // Completions
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: false, strings: true },
    parameterHints: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      preview: true,
      previewMode: 'prefix',
      filterGraceful: true,
      insertMode: 'replace'
    },

    // Inlay hints
    inlayHints: { enabled: 'on' }
  })

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue()
    emit('update:modelValue', value)
    changeDocument(value)
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('run')
  })

  diagnosticsCleanup = window.electronAPI.onLspDiagnostics((params) => {
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    if (params.uri !== currentUri) {
      return
    }

    const markers = (params.diagnostics as Array<{
      severity?: number
      range: { start: { line: number; character: number }; end: { line: number; character: number } }
      message: string
    }>).map((d) => ({
      severity: d.severity === 1 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      message: d.message,
      source: 'Intelephense'
    }))

    monaco.editor.setModelMarkers(model, 'intelephense', markers)
  })

  aiCompletionDisposable = registerCompletion(monaco, editor, {
    language: 'php',
    trigger: 'onIdle',
    enableCaching: true,
    requestHandler: async ({ body }) => {
      if (!props.aiEnabled) return { completion: null }

      const meta = body.completionMetadata
      const result = await window.electronAPI.aiGetCompletion(
        {
          textBeforeCursor: meta.textBeforeCursor,
          textAfterCursor: meta.textAfterCursor,
          language: meta.language ?? 'php',
          cursorPosition: meta.cursorPosition
        },
        {
          framework: props.framework as 'laravel' | 'symfony' | 'wordpress' | 'plain' | undefined,
          projectPath: props.projectPath ?? undefined
        }
      )

      return { completion: result.ok ? result.data ?? null : null }
    },
    onError: (error) => {
      console.warn('[AI completion]', error.message)
    }
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

// Combined watcher: triggers when either projectPath or lspReady changes.
// immediate:true ensures didOpen fires even if the component mounts with
// both values already set (e.g. re-opening app with a saved project).
watch(
  () => [props.projectPath, props.lspReady] as const,
  async ([projectPath, ready]) => {
    if (!projectPath || !ready) return

    // Close previous scratch document before switching workspace
    if (currentUri) {
      await window.electronAPI.lspDidClose(currentUri).catch(() => undefined)
    }

    currentUri = await window.electronAPI.lspPathToUri(`${projectPath}/phplay-scratch.php`)
    registerLspProviders(currentUri)
    await openDocument()

    // Load Laravel-specific completions in the background
    if (props.framework === 'laravel' && props.selectedPhp) {
      loadLaravelMeta(projectPath, props.selectedPhp).then((meta) => {
        if (!meta) return
        laravelCompletionDisposable?.dispose()
        laravelCompletionDisposable = registerLaravelCompletionProvider(monaco, meta)
      })
    }
  },
  { immediate: true }
)

onBeforeUnmount(async () => {
  if (currentUri) {
    await window.electronAPI.lspDidClose(currentUri).catch(() => undefined)
    if (editor) {
      const model = editor.getModel()
      if (model) monaco.editor.setModelMarkers(model, 'intelephense', [])
    }
  }
  disposeProviders()
  diagnosticsCleanup?.()
  diagnosticsCleanup = null
  aiCompletionDisposable?.deregister()
  aiCompletionDisposable = null
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
