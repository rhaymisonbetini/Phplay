<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { SshConnectionConfig } from '../../types/electron'

const props = defineProps<{
  initial?: Partial<SshConnectionConfig>
}>()

const emit = defineEmits<{
  saved: [config: SshConnectionConfig]
  cancel: []
}>()

const COLORS = ['#9D5BFF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

const form = reactive<Omit<SshConnectionConfig, 'id'>>({
  name: props.initial?.name ?? '',
  color: props.initial?.color ?? COLORS[0],
  host: props.initial?.host ?? '',
  port: props.initial?.port ?? 22,
  username: props.initial?.username ?? '',
  authType: props.initial?.authType ?? 'password',
  password: props.initial?.password ?? '',
  privateKeyPath: props.initial?.privateKeyPath ?? '~/.ssh/id_rsa',
  passphrase: props.initial?.passphrase ?? '',
  remotePath: props.initial?.remotePath ?? '/var/www',
  phpBinary: props.initial?.phpBinary ?? '',
  framework: props.initial?.framework ?? 'plain'
})

const testing = ref(false)
const saving = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)

const isEditing = computed(() => !!props.initial?.id)

async function testConnection(): Promise<void> {
  if (form.authType === 'key' && !form.privateKeyPath?.trim()) {
    testResult.value = { ok: false, message: 'Private key path is required for SSH Key auth.' }
    return
  }

  testing.value = true
  testResult.value = null

  const config = { ...form, id: props.initial?.id ?? '' } as SshConnectionConfig

  try {
    const result = await window.electronAPI.sshTest(config)
    if (result.ok && result.data) {
      const fw = result.data.framework ?? 'plain'
      const fwLabel = { laravel: 'Laravel', symfony: 'Symfony', wordpress: 'WordPress', plain: 'PHP' }[fw] ?? fw
      testResult.value = {
        ok: true,
        message: `Connected — PHP ${result.data.phpVersion} · ${fwLabel} detected`
      }
      form.phpBinary = result.data.phpBinary
      form.framework = fw
    } else {
      testResult.value = {
        ok: false,
        message: result.error?.message ?? 'Connection failed'
      }
    }
  } catch (err) {
    testResult.value = { ok: false, message: String(err) }
  } finally {
    testing.value = false
  }
}

async function save(): Promise<void> {
  if (!form.name || !form.host || !form.username) return

  saving.value = true
  try {
    const config = { ...form, id: props.initial?.id ?? crypto.randomUUID() } as SshConnectionConfig
    const saved = await window.electronAPI.sshSave(config)
    emit('saved', saved)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 px-3 py-3 overflow-y-auto">
    <p class="text-xs font-semibold text-text-primary">
      {{ isEditing ? 'Edit Connection' : 'New SSH Connection' }}
    </p>

    <!-- Name + Color -->
    <div class="flex gap-2 items-end">
      <div class="flex-1">
        <label class="form-label">Name</label>
        <input v-model="form.name" class="form-input" placeholder="My Server" />
      </div>
      <div class="flex gap-1 pb-1">
        <button
          v-for="c in COLORS"
          :key="c"
          class="w-4 h-4 rounded-full border-2 transition-all"
          :style="{ background: c, borderColor: form.color === c ? 'white' : 'transparent' }"
          @click="form.color = c"
        />
      </div>
    </div>

    <!-- Host + Port -->
    <div class="flex gap-2">
      <div class="flex-1">
        <label class="form-label">Host</label>
        <input v-model="form.host" class="form-input" placeholder="1.2.3.4" />
      </div>
      <div style="width: 72px">
        <label class="form-label">Port</label>
        <input v-model.number="form.port" type="number" class="form-input" />
      </div>
    </div>

    <!-- Username -->
    <div>
      <label class="form-label">Username</label>
      <input v-model="form.username" class="form-input" placeholder="ubuntu" />
    </div>

    <!-- Auth Type -->
    <div>
      <label class="form-label">Auth Type</label>
      <div class="flex gap-1 mt-1">
        <button
          class="flex-1 py-1 text-2xs rounded border transition-colors"
          :class="form.authType === 'password' ? 'border-accent text-accent bg-accent/10' : 'border-border-subtle text-text-muted'"
          @click="form.authType = 'password'"
        >
          Password
        </button>
        <button
          class="flex-1 py-1 text-2xs rounded border transition-colors"
          :class="form.authType === 'key' ? 'border-accent text-accent bg-accent/10' : 'border-border-subtle text-text-muted'"
          @click="form.authType = 'key'"
        >
          SSH Key
        </button>
      </div>
    </div>

    <!-- Password (conditional) -->
    <div v-if="form.authType === 'password'">
      <label class="form-label">Password</label>
      <input v-model="form.password" type="password" class="form-input" placeholder="••••••••" />
    </div>

    <!-- Key fields (conditional) -->
    <template v-else>
      <div>
        <label class="form-label">Private Key Path</label>
        <input v-model="form.privateKeyPath" class="form-input" placeholder="~/.ssh/id_rsa" />
      </div>
      <div>
        <label class="form-label">Passphrase (optional)</label>
        <input v-model="form.passphrase" type="password" class="form-input" placeholder="••••••••" />
      </div>
    </template>

    <!-- Remote Path -->
    <div>
      <label class="form-label">Remote Working Directory</label>
      <input v-model="form.remotePath" class="form-input" placeholder="/var/www/myapp" />
    </div>

    <!-- PHP Binary + Framework (auto-detected) -->
    <div class="flex gap-2 items-end">
      <div class="flex-1">
        <label class="form-label">PHP Binary Path</label>
        <input v-model="form.phpBinary" class="form-input" placeholder="/usr/bin/php" />
      </div>
      <div
        v-if="form.framework && form.framework !== 'plain'"
        class="shrink-0 pb-1 rounded px-2 py-1 text-2xs font-semibold"
        :class="{
          'bg-red-900/30 text-red-400 border border-red-800/50': form.framework === 'laravel',
          'bg-zinc-800/50 text-zinc-400 border border-zinc-700': form.framework === 'symfony',
          'bg-blue-900/30 text-blue-400 border border-blue-800/50': form.framework === 'wordpress',
        }"
      >
        {{ { laravel: 'Laravel', symfony: 'Symfony', wordpress: 'WordPress' }[form.framework] }}
      </div>
    </div>
    <p class="mt-0.5 text-2xs text-text-disabled">PHP path and framework are auto-detected on "Test".</p>

    <!-- Test Result -->
    <div
      v-if="testResult"
      class="rounded px-2 py-1.5 text-2xs break-all"
      :class="testResult.ok ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-red-900/20 text-red-400 border border-red-800'"
    >
      {{ testResult.message }}
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-1">
      <button
        class="flex-1 py-1.5 text-2xs rounded border border-border-subtle text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-1"
        :disabled="testing"
        @click="testConnection"
      >
        <svg v-if="!testing" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3.5 5h3M5 3.5v3" />
        </svg>
        <svg v-else class="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M5 1a4 4 0 0 1 4 4" />
        </svg>
        {{ testing ? 'Testing…' : 'Test' }}
      </button>
      <button
        class="py-1.5 px-2 text-2xs rounded border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="flex-1 py-1.5 text-2xs rounded bg-accent text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
        :disabled="!form.name || !form.host || !form.username || saving"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-label {
  display: block;
  font-size: 0.65rem;
  color: var(--text-disabled);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.form-input {
  width: 100%;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: var(--php-400);
}
</style>
