<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'

// Monaco workers are not configured in the base setup.
// The editor works via Monarch tokenizers (main thread) without workers.
// Full worker setup (IntelliSense, diagnostics) will be done in issue T-03.
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
  }>(),
  {
    modelValue: '<?php\n\n',
    language: 'php',
    readOnly: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: 'vs-dark',
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
    insertSpaces: true
  })

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue())
  })

  // Ctrl+Enter to trigger run (emits to parent)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('update:modelValue', editor!.getValue())
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

onBeforeUnmount(() => {
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
