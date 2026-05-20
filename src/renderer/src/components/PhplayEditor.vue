<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { phplayDarkTheme } from '../assets/monaco-theme'
import { PHP_FUNCTIONS, PHP_CONSTANTS } from '../data/phpBuiltins'

// Stub worker — Electron doesn't support real Monaco workers via file://
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
  }>(),
  {
    modelValue: '<?php\n\n',
    language: 'php',
    readOnly: false,
    projectPath: null
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  run: []
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let completionDisposable: monaco.IDisposable | null = null

// ── Completion provider ───────────────────────────────────────────────────────

let projectClasses: string[] = []

function buildCompletions(word: monaco.editor.IWordAtPosition, position: monaco.Position): monaco.languages.CompletionItem[] {
  const range: monaco.IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn
  }

  const items: monaco.languages.CompletionItem[] = []

  // PHP built-in functions
  for (const fn of PHP_FUNCTIONS) {
    items.push({
      label: fn,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: fn,
      range,
      detail: 'PHP built-in'
    })
  }

  // PHP constants
  for (const c of PHP_CONSTANTS) {
    items.push({
      label: c,
      kind: monaco.languages.CompletionItemKind.Constant,
      insertText: c,
      range,
      detail: 'PHP constant'
    })
  }

  // Project/vendor classes — show short name, full namespace as detail
  for (const fqn of projectClasses) {
    const parts = fqn.split('\\')
    const shortName = parts[parts.length - 1]
    items.push({
      label: shortName,
      kind: monaco.languages.CompletionItemKind.Class,
      insertText: shortName,
      range,
      detail: fqn
    })
  }

  return items
}

function registerCompletionProvider(): void {
  if (completionDisposable) {
    completionDisposable.dispose()
  }

  completionDisposable = monaco.languages.registerCompletionItemProvider('php', {
    triggerCharacters: ['\\', ':', '$', ' '],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      return { suggestions: buildCompletions(word, position) }
    }
  })
}

async function loadProjectClasses(projectPath: string): Promise<void> {
  if (!window.electronAPI?.scanProjectClasses) return
  try {
    const result = await window.electronAPI.scanProjectClasses(projectPath)
    projectClasses = result.classes
  } catch {
    projectClasses = []
  }
}

// ── Editor lifecycle ──────────────────────────────────────────────────────────

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
    parameterHints: { enabled: true },
  })

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue())
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('run')
  })

  registerCompletionProvider()

  // Load classes if project is already set on mount
  if (props.projectPath) {
    loadProjectClasses(props.projectPath)
  }
})

// Reload classes when project path changes
watch(
  () => props.projectPath,
  async (path) => {
    if (!path) { projectClasses = []; return }
    await loadProjectClasses(path)
  }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      editor.setValue(newValue)
    }
  }
)

onBeforeUnmount(() => {
  completionDisposable?.dispose()
  completionDisposable = null
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
