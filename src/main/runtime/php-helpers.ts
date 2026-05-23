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
if (!function_exists('phplay_render')) {
    function phplay_render($__v) {
        $prefix = '__PHPLAY_OUTPUT__:';
        if ($__v === null) {
            echo $prefix . json_encode(['type' => 'null']) . PHP_EOL;
            return;
        }
        if (is_bool($__v)) {
            echo $prefix . json_encode(['type' => 'bool', 'value' => $__v]) . PHP_EOL;
            return;
        }
        if (is_int($__v)) {
            echo $prefix . json_encode(['type' => 'int', 'value' => $__v]) . PHP_EOL;
            return;
        }
        if (is_float($__v)) {
            echo $prefix . json_encode(['type' => 'float', 'value' => $__v]) . PHP_EOL;
            return;
        }
        if (is_string($__v)) {
            echo $prefix . json_encode(['type' => 'string', 'value' => $__v]) . PHP_EOL;
            return;
        }
        if (is_array($__v)) {
            echo $prefix . json_encode([
                'type'  => 'array',
                'count' => count($__v),
                'items' => phplay_array_items($__v),
            ]) . PHP_EOL;
            return;
        }
        if ($__v instanceof \\Throwable) {
            echo $prefix . json_encode([
                'type'    => 'exception',
                'class'   => get_class($__v),
                'message' => $__v->getMessage(),
                'file'    => $__v->getFile(),
                'line'    => $__v->getLine(),
                'trace'   => phplay_format_trace($__v->getTrace()),
            ]) . PHP_EOL;
            return;
        }
        if (is_object($__v)) {
            // Eloquent Model — has getAttributes()
            if (method_exists($__v, 'getAttributes')) {
                $attrs = [];
                foreach ($__v->getAttributes() as $k => $val) {
                    $attrs[$k] = phplay_typed_value($val);
                }
                echo $prefix . json_encode([
                    'type'       => 'model',
                    'class'      => get_class($__v),
                    'attributes' => $attrs,
                ]) . PHP_EOL;
                return;
            }
            // Collection — has count() + toArray()
            if (method_exists($__v, 'count') && method_exists($__v, 'toArray')) {
                $items = [];
                $i = 0;
                foreach ($__v as $item) {
                    if ($i >= 10) break;
                    $items[] = phplay_typed_value($item);
                    $i++;
                }
                echo $prefix . json_encode([
                    'type'  => 'collection',
                    'class' => get_class($__v),
                    'count' => $__v->count(),
                    'items' => $items,
                ]) . PHP_EOL;
                return;
            }
            // Generic object
            $props = [];
            foreach ((array)$__v as $k => $val) {
                $props[ltrim($k, "\\0*\\0")] = phplay_typed_value($val);
            }
            echo $prefix . json_encode([
                'type'       => 'object',
                'class'      => get_class($__v),
                'properties' => $props,
            ]) . PHP_EOL;
            return;
        }
        var_dump($__v);
    }
}
`
