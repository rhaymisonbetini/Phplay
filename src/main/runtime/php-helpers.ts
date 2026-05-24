export const PHP_BASE_HELPERS = `
if (!function_exists('d')) {
    function d(...$__args) {
        foreach ($__args as $__v) { var_dump($__v); }
    }
}
if (!function_exists('dd')) {
    function dd(...$__args) {
        foreach ($__args as $__v) { var_dump($__v); }
        exit(0);
    }
}
if (!function_exists('phplay_json')) {
    function phplay_json($__v) {
        echo json_encode($__v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
if (!function_exists('phplay_typed_value')) {
    function phplay_typed_value($v) {
        if ($v === null) return ['type' => 'null', 'value' => null];
        if (is_bool($v)) return ['type' => 'bool', 'value' => $v];
        if (is_int($v)) return ['type' => 'int', 'value' => $v];
        if (is_float($v)) return ['type' => 'float', 'value' => $v];
        if (is_string($v)) return ['type' => 'string', 'value' => $v];
        if (is_array($v)) return ['type' => 'array', 'count' => count($v)];
        if (is_object($v)) return ['type' => 'object', 'class' => get_class($v)];
        return ['type' => 'unknown', 'value' => (string)$v];
    }
}
if (!function_exists('phplay_array_items')) {
    function phplay_array_items($arr, $limit = 20) {
        $items = [];
        $i = 0;
        foreach ($arr as $k => $v) {
            if ($i >= $limit) { $items[] = ['key' => '...', 'value' => ['type' => 'truncated', 'remaining' => count($arr) - $i]]; break; }
            $items[] = ['key' => $k, 'value' => phplay_typed_value($v)];
            $i++;
        }
        return $items;
    }
}
if (!function_exists('phplay_format_trace')) {
    function phplay_format_trace($trace) {
        $frames = [];
        foreach (array_slice($trace, 0, 10) as $frame) {
            $frames[] = [
                'file'     => $frame['file'] ?? '[internal]',
                'line'     => $frame['line'] ?? 0,
                'function' => ($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? ''),
            ];
        }
        return $frames;
    }
}
if (!function_exists('phplay_serialize')) {
    function phplay_serialize($__v) {
        if ($__v === null) return ['type' => 'null'];
        if (is_bool($__v)) return ['type' => 'bool', 'value' => $__v];
        if (is_int($__v)) return ['type' => 'int', 'value' => $__v];
        if (is_float($__v)) return ['type' => 'float', 'value' => $__v];
        if (is_string($__v)) return ['type' => 'string', 'value' => $__v];
        if (is_array($__v)) {
            return [
                'type'  => 'array',
                'count' => count($__v),
                'items' => phplay_array_items($__v),
            ];
        }
        if ($__v instanceof \\Throwable) {
            return [
                'type'    => 'exception',
                'class'   => get_class($__v),
                'message' => $__v->getMessage(),
                'file'    => $__v->getFile(),
                'line'    => $__v->getLine(),
                'trace'   => phplay_format_trace($__v->getTrace()),
            ];
        }
        if (is_object($__v)) {
            // Eloquent Model — has getAttributes()
            if (method_exists($__v, 'getAttributes')) {
                $hidden = method_exists($__v, 'getHidden') ? array_flip($__v->getHidden()) : [];
                $attrs = [];
                foreach ($__v->getAttributes() as $k => $val) {
                    if (isset($hidden[$k])) continue;
                    $attrs[$k] = phplay_typed_value($val);
                }
                return [
                    'type'       => 'model',
                    'class'      => get_class($__v),
                    'key'        => method_exists($__v, 'getKey') ? $__v->getKey() : null,
                    'attributes' => $attrs,
                ];
            }
            // Collection — has count() + each()
            if (method_exists($__v, 'count') && method_exists($__v, 'each')) {
                $items = [];
                $i = 0;
                foreach ($__v as $item) {
                    if ($i >= 10) break;
                    $items[] = phplay_serialize($item);
                    $i++;
                }
                return [
                    'type'  => 'collection',
                    'class' => get_class($__v),
                    'count' => $__v->count(),
                    'items' => $items,
                ];
            }
            // Generic object
            $props = [];
            foreach ((array)$__v as $k => $val) {
                $props[ltrim($k, "\\0*\\0")] = phplay_typed_value($val);
            }
            return [
                'type'       => 'object',
                'class'      => get_class($__v),
                'properties' => $props,
            ];
        }
        return ['type' => 'unknown', 'value' => (string)$__v];
    }
}
if (!function_exists('phplay_render')) {
    function phplay_render($__v) {
        $payload = phplay_serialize($__v);
        echo '__PHPLAY_OUTPUT__:' . json_encode($payload) . PHP_EOL;
    }
}
`
