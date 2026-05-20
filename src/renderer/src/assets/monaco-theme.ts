import type * as Monaco from 'monaco-editor'

export const phplayDarkTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Base
    { token: '', foreground: 'e4e4e7', background: '1e1e21' },

    // Comments
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '6b7280', fontStyle: 'italic' },

    // PHP-specific
    { token: 'keyword', foreground: 'c084fc' },
    { token: 'keyword.control', foreground: 'c084fc' },
    { token: 'keyword.operator', foreground: '94a3b8' },
    { token: 'keyword.other', foreground: 'c084fc' },

    // Strings
    { token: 'string', foreground: '86efac' },
    { token: 'string.quoted', foreground: '86efac' },
    { token: 'string.template', foreground: '86efac' },

    // Numbers
    { token: 'number', foreground: 'fb923c' },
    { token: 'number.float', foreground: 'fb923c' },
    { token: 'number.hex', foreground: 'fb923c' },

    // Variables
    { token: 'variable', foreground: 'f87171' },
    { token: 'variable.predefined', foreground: 'f87171', fontStyle: 'italic' },

    // Functions
    { token: 'identifier', foreground: '60a5fa' },
    { token: 'type', foreground: '34d399' },

    // Operators & punctuation
    { token: 'delimiter', foreground: '94a3b8' },
    { token: 'operator', foreground: '94a3b8' },

    // Tags (HTML embedded in PHP)
    { token: 'tag', foreground: '60a5fa' },
    { token: 'attribute.name', foreground: '86efac' },
    { token: 'attribute.value', foreground: 'fb923c' },

    // PHP open/close tags
    { token: 'metatag', foreground: 'a78bfa', fontStyle: 'bold' },

    // Constants
    { token: 'constant', foreground: 'fb923c' },
    { token: 'constant.language', foreground: 'a78bfa' }
  ],
  colors: {
    'editor.background': '#1e1e21',
    'editor.foreground': '#e4e4e7',
    'editor.lineHighlightBackground': '#27272a',
    'editor.selectionBackground': '#3f3f4680',
    'editor.inactiveSelectionBackground': '#2d2d3060',
    'editorCursor.foreground': '#10b981',
    'editorLineNumber.foreground': '#52525b',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editorIndentGuide.background': '#2a2a2d',
    'editorIndentGuide.activeBackground': '#3f3f46',
    'editorWhitespace.foreground': '#3f3f46',
    'editorRuler.foreground': '#2a2a2d',
    'editorWidget.background': '#1e1e21',
    'editorWidget.border': '#3f3f46',
    'editorSuggestWidget.background': '#1e1e21',
    'editorSuggestWidget.border': '#3f3f46',
    'editorSuggestWidget.selectedBackground': '#27272a',
    'editorHoverWidget.background': '#1e1e21',
    'editorHoverWidget.border': '#3f3f46',
    'scrollbarSlider.background': '#3f3f4660',
    'scrollbarSlider.hoverBackground': '#52525b80',
    'scrollbarSlider.activeBackground': '#71717a80',
    'minimap.background': '#18181b',
    'editorGutter.background': '#1e1e21'
  }
}
