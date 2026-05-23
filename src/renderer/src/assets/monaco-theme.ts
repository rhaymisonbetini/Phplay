import type * as Monaco from 'monaco-editor'

export const phplayDarkTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Base
    { token: '', foreground: 'E6EDF3', background: '1E2430' },

    // Comments
    { token: 'comment',       foreground: '546E7A', fontStyle: 'italic' },
    { token: 'comment.line',  foreground: '546E7A', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '546E7A', fontStyle: 'italic' },

    // PHP keywords
    { token: 'keyword',         foreground: 'BD93F9' },
    { token: 'keyword.control', foreground: 'BD93F9' },
    { token: 'keyword.other',   foreground: 'BD93F9' },
    { token: 'keyword.operator',foreground: '9BA7B4' },

    // Strings
    { token: 'string',        foreground: '50FA7B' },
    { token: 'string.quoted', foreground: '50FA7B' },
    { token: 'string.template',foreground: '50FA7B' },

    // Numbers
    { token: 'number',       foreground: 'FFB86C' },
    { token: 'number.float', foreground: 'FFB86C' },
    { token: 'number.hex',   foreground: 'FFB86C' },

    // Variables ($var)
    { token: 'variable',            foreground: 'FF79C6' },
    { token: 'variable.predefined', foreground: 'FF79C6', fontStyle: 'italic' },

    // Functions and identifiers
    { token: 'identifier', foreground: '00D8FF' },
    { token: 'type',       foreground: '8BE9FD' },

    // Constants
    { token: 'constant',          foreground: 'FFB86C' },
    { token: 'constant.language', foreground: 'BD93F9' },

    // Operators & punctuation
    { token: 'delimiter', foreground: '9BA7B4' },
    { token: 'operator',  foreground: 'FF79C6' },

    // PHP tags
    { token: 'metatag', foreground: 'BD93F9', fontStyle: 'bold' },

    // HTML embedded in PHP
    { token: 'tag',             foreground: '00D8FF' },
    { token: 'attribute.name',  foreground: '50FA7B' },
    { token: 'attribute.value', foreground: 'FFB86C' }
  ],
  colors: {
    // Editor canvas
    'editor.background':             '#1E2430',
    'editor.foreground':             '#E6EDF3',

    // Line highlights
    'editor.lineHighlightBackground':      '#202938',
    'editor.lineHighlightBorder':          '#00000000',

    // Selection
    'editor.selectionBackground':         '#BD93F940',
    'editor.inactiveSelectionBackground': '#BD93F920',
    'editor.selectionHighlightBackground':'#BD93F918',

    // Cursor
    'editorCursor.foreground': '#00D8FF',
    'editorCursor.background': '#161B22',

    // Line numbers
    'editorLineNumber.foreground':       '#435060',
    'editorLineNumber.activeForeground': '#9BA7B4',

    // Indent guides
    'editorIndentGuide.background':       '#1D2635',
    'editorIndentGuide.activeBackground': '#253043',

    // Whitespace
    'editorWhitespace.foreground': '#253043',

    // Bracket match
    'editorBracketMatch.background': 'rgba(0,216,255,0.08)',
    'editorBracketMatch.border':     '#00D8FF60',

    // Bracket pair colorization
    'editorBracketHighlight.foreground1': '#00D8FF',
    'editorBracketHighlight.foreground2': '#BD93F9',
    'editorBracketHighlight.foreground3': '#50FA7B',
    'editorBracketHighlight.foreground4': '#FFB86C',

    // Widgets (suggest, hover)
    'editorWidget.background':  '#202938',
    'editorWidget.border':      '#253043',
    'editorWidget.foreground':  '#E6EDF3',

    // Suggest widget
    'editorSuggestWidget.background':                '#202938',
    'editorSuggestWidget.border':                    '#253043',
    'editorSuggestWidget.foreground':                '#E6EDF3',
    'editorSuggestWidget.selectedBackground':        '#243042',
    'editorSuggestWidget.selectedForeground':        '#E6EDF3',
    'editorSuggestWidget.highlightForeground':       '#00D8FF',
    'editorSuggestWidget.focusHighlightForeground':  '#00D8FF',

    // Hover widget
    'editorHoverWidget.background':    '#202938',
    'editorHoverWidget.border':        '#253043',
    'editorHoverWidget.foreground':    '#E6EDF3',
    'editorHoverWidget.statusBarBackground': '#1E2430',

    // Scrollbar
    'scrollbarSlider.background':       '#253043',
    'scrollbarSlider.hoverBackground':  '#2E3D55',
    'scrollbarSlider.activeBackground': '#3A4F6A',

    // Minimap
    'minimap.background':           '#1E2430',
    'minimapSlider.background':     '#25304380',
    'minimapSlider.hoverBackground':'#2E3D5580',

    // Gutter
    'editorGutter.background': '#1E2430',

    // Error/warning squiggles
    'editorError.foreground':   '#FF5555',
    'editorWarning.foreground': '#FFB86C',
    'editorInfo.foreground':    '#00D8FF',

    // Ruler
    'editorRuler.foreground': '#1D2635',

    // Inlay hints
    'editorInlayHint.background':   '#20293880',
    'editorInlayHint.foreground':   '#6B7C8E',
    'editorInlayHint.typeForeground': '#BD93F9',
    'editorInlayHint.parameterForeground': '#9BA7B4'
  }
}
