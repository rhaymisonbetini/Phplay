import { writeFile } from 'fs/promises'
import { join } from 'path'
import type { LaravelMetadata } from './LaravelDiscoveryService'

// Common Laravel facades with their real class mappings
const FACADE_STUBS: Array<{ alias: string; class: string; methods: string[] }> = [
  {
    alias: 'DB',
    class: 'Illuminate\\Support\\Facades\\DB',
    methods: [
      'public static function table(string $table): \\Illuminate\\Database\\Query\\Builder {}',
      'public static function select(string $query, array $bindings = []): array {}',
      'public static function insert(string $query, array $bindings = []): bool {}',
      'public static function update(string $query, array $bindings = []): int {}',
      'public static function delete(string $query, array $bindings = []): int {}',
      'public static function statement(string $query, array $bindings = []): bool {}',
      'public static function transaction(\\Closure $callback, int $attempts = 1): mixed {}',
      'public static function beginTransaction(): void {}',
      'public static function commit(): void {}',
      'public static function rollBack(): void {}'
    ]
  },
  {
    alias: 'Route',
    class: 'Illuminate\\Support\\Facades\\Route',
    methods: [
      'public static function get(string $uri, mixed $action): \\Illuminate\\Routing\\Route {}',
      'public static function post(string $uri, mixed $action): \\Illuminate\\Routing\\Route {}',
      'public static function put(string $uri, mixed $action): \\Illuminate\\Routing\\Route {}',
      'public static function patch(string $uri, mixed $action): \\Illuminate\\Routing\\Route {}',
      'public static function delete(string $uri, mixed $action): \\Illuminate\\Routing\\Route {}',
      'public static function group(array $attributes, \\Closure $routes): void {}',
      'public static function middleware(mixed $middleware): \\Illuminate\\Routing\\RouteRegistrar {}'
    ]
  },
  {
    alias: 'Cache',
    class: 'Illuminate\\Support\\Facades\\Cache',
    methods: [
      'public static function get(string $key, mixed $default = null): mixed {}',
      'public static function put(string $key, mixed $value, int $seconds): bool {}',
      'public static function forget(string $key): bool {}',
      'public static function has(string $key): bool {}',
      'public static function remember(string $key, int $seconds, \\Closure $callback): mixed {}',
      'public static function flush(): bool {}'
    ]
  },
  {
    alias: 'Auth',
    class: 'Illuminate\\Support\\Facades\\Auth',
    methods: [
      'public static function user(): mixed {}',
      'public static function id(): int|string|null {}',
      'public static function check(): bool {}',
      'public static function guest(): bool {}',
      'public static function login(mixed $user, bool $remember = false): void {}',
      'public static function logout(): void {}',
      'public static function attempt(array $credentials, bool $remember = false): bool {}'
    ]
  },
  {
    alias: 'Log',
    class: 'Illuminate\\Support\\Facades\\Log',
    methods: [
      'public static function info(string $message, array $context = []): void {}',
      'public static function error(string $message, array $context = []): void {}',
      'public static function warning(string $message, array $context = []): void {}',
      'public static function debug(string $message, array $context = []): void {}',
      'public static function critical(string $message, array $context = []): void {}'
    ]
  },
  {
    alias: 'Storage',
    class: 'Illuminate\\Support\\Facades\\Storage',
    methods: [
      'public static function get(string $path): string|null {}',
      'public static function put(string $path, mixed $contents): bool {}',
      'public static function delete(string|array $paths): bool {}',
      'public static function exists(string $path): bool {}',
      'public static function url(string $path): string {}',
      'public static function files(string $directory = ""): array {}'
    ]
  },
  {
    alias: 'Request',
    class: 'Illuminate\\Support\\Facades\\Request',
    methods: [
      'public static function input(string $key = null, mixed $default = null): mixed {}',
      'public static function get(string $key, mixed $default = null): mixed {}',
      'public static function has(string|array $key): bool {}',
      'public static function all(): array {}',
      'public static function only(array|string $keys): array {}',
      'public static function validate(array $rules): array {}'
    ]
  },
  {
    alias: 'Session',
    class: 'Illuminate\\Support\\Facades\\Session',
    methods: [
      'public static function get(string $key, mixed $default = null): mixed {}',
      'public static function put(string $key, mixed $value): void {}',
      'public static function forget(string|array $keys): void {}',
      'public static function has(string $key): bool {}',
      'public static function flash(string $key, mixed $value): void {}',
      'public static function flush(): void {}'
    ]
  },
  {
    alias: 'Config',
    class: 'Illuminate\\Support\\Facades\\Config',
    methods: [
      'public static function get(string $key, mixed $default = null): mixed {}',
      'public static function set(array|string $key, mixed $value = null): void {}',
      'public static function has(string $key): bool {}'
    ]
  },
  {
    alias: 'Event',
    class: 'Illuminate\\Support\\Facades\\Event',
    methods: [
      'public static function dispatch(mixed $event, mixed $payload = [], bool $halt = false): mixed {}',
      'public static function listen(string|array $events, mixed $listener): void {}'
    ]
  },
  {
    alias: 'Mail',
    class: 'Illuminate\\Support\\Facades\\Mail',
    methods: [
      'public static function to(mixed $address): \\Illuminate\\Mail\\PendingMail {}',
      'public static function send(mixed $mailable): void {}',
      'public static function queue(mixed $mailable): void {}'
    ]
  },
  {
    alias: 'Queue',
    class: 'Illuminate\\Support\\Facades\\Queue',
    methods: [
      'public static function push(mixed $job, mixed $data = "", string $queue = null): mixed {}',
      'public static function later(mixed $delay, mixed $job, mixed $data = ""): mixed {}'
    ]
  }
]

export class LaravelStubGenerator {
  async generate(generatedPath: string, meta: LaravelMetadata): Promise<void> {
    await Promise.all([
      this.writeFacadeStubs(generatedPath),
      this.writeModelStubs(generatedPath, meta)
    ])
  }

  private async writeFacadeStubs(generatedPath: string): Promise<void> {
    const lines = ['<?php', '// Phplay: Laravel facade stubs for Intelephense', '']

    for (const facade of FACADE_STUBS) {
      lines.push(`namespace Illuminate\\Support\\Facades;`)
      lines.push(`class ${facade.alias} {`)
      for (const method of facade.methods) {
        lines.push(`    ${method}`)
      }
      lines.push(`}`)
      lines.push('')
    }

    await writeFile(join(generatedPath, '_phplay_facades.php'), lines.join('\n'), 'utf-8')
  }

  private async writeModelStubs(generatedPath: string, meta: LaravelMetadata): Promise<void> {
    if (meta.models.length === 0) return

    const ns = meta.composer.appNamespace.replace(/\\+$/, '')
    const lines = ['<?php', '// Phplay: discovered model imports', '']

    for (const model of meta.models) {
      lines.push(`namespace ${ns}\\Models;`)
      lines.push(`class ${model} extends \\Illuminate\\Database\\Eloquent\\Model {}`)
      lines.push('')
    }

    await writeFile(join(generatedPath, '_phplay_models.php'), lines.join('\n'), 'utf-8')
  }
}
