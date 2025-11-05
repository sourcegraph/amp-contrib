# React Native Migration Toolbox

This directory contains ts-morph-based toolbox tools for detecting React Native migration patterns with high accuracy through AST parsing.

## Setup

1. **Install ts-morph** (required dependency):
   ```bash
   npm install -g ts-morph
   # or in your project
   npm install ts-morph
   ```

2. **Set AMP_TOOLBOX environment variable**:
   ```bash
   export AMP_TOOLBOX="$PWD/.amp/tools"
   # Add to ~/.zshrc or ~/.bashrc to persist
   ```

3. **Verify tools are registered**:
   ```bash
   # In Amp, the tools will show up with tb__ prefix:
   # - tb__detect-jsx-patterns
   # - tb__detect-browser-apis
   # - tb__detect-style-usage
   # - tb__detect-imports
   ```

## Available Tools

### 1. detect-jsx-patterns

**Purpose**: Find HTML-like JSX elements that need transformation to React Native components.

**Parameters**:
- `filePath` (string): Absolute path to .tsx/.jsx/.ts/.js file

**Returns**:
```json
{
  "totalHtmlElements": 15,
  "elementCounts": {
    "div": 8,
    "span": 4,
    "button": 2,
    "img": 1
  },
  "patterns": [
    {
      "element": "div",
      "line": 10,
      "attributes": [...],
      "suggestedReplacement": "View"
    }
  ],
  "migrationGuides": ["components-migration.md"]
}
```

**Use in Amp**:
```
Use tb__detect-jsx-patterns to analyze App.tsx and tell me what components need migration
```

### 2. detect-browser-apis

**Purpose**: Find browser API usage (localStorage, window, document, etc.).

**Parameters**:
- `filePath` (string): Absolute path to file

**Returns**:
```json
{
  "totalBrowserAPIs": 5,
  "patterns": {
    "storage": [{
      "api": "localStorage",
      "usage": "localStorage.getItem('token')",
      "line": 25,
      "suggestedReplacement": "AsyncStorage..."
    }],
    "window": [...],
    "document": [...]
  },
  "migrationGuides": ["browser-apis-migration.md"]
}
```

**Use in Amp**:
```
Analyze auth.ts with tb__detect-browser-apis to find storage issues
```

### 3. detect-style-usage

**Purpose**: Find styling patterns (className, CSS imports, inline styles).

**Parameters**:
- `filePath` (string): Absolute path to file

**Returns**:
```json
{
  "totalStyleIssues": 12,
  "patterns": {
    "cssImports": [{
      "import": "import './App.css'",
      "line": 2,
      "suggestedAction": "Remove CSS import..."
    }],
    "classNameUsage": [...],
    "inlineStyles": [...]
  },
  "criticalTransformations": [
    "Replace all className props with style props",
    "Convert CSS property names from kebab-case to camelCase"
  ]
}
```

**Use in Amp**:
```
Use tb__detect-style-usage on Button.tsx to see what styling needs migration
```

### 4. detect-imports

**Purpose**: Analyze imports and suggest React Native package equivalents.

**Parameters**:
- `filePath` (string): Absolute path to file

**Returns**:
```json
{
  "summary": {
    "total": 15,
    "needsReplacement": 3,
    "reactNativeReady": 10,
    "needsReview": 2
  },
  "imports": {
    "needsReplacement": [{
      "package": "react-router-dom",
      "suggestedReplacement": "@react-navigation/native",
      "migrationGuide": "browser-apis-migration.md"
    }]
  }
}
```

**Use in Amp**:
```
Run tb__detect-imports on index.tsx to check package compatibility
```

## Example Workflow

```bash
# 1. Detect all patterns in a file
Use tb__detect-jsx-patterns, tb__detect-browser-apis, tb__detect-style-usage, 
and tb__detect-imports on src/components/Dashboard.tsx

# 2. Review the results and plan migration

# 3. Use codemod tool with specific guidance based on detected patterns
Use the codemod tool to migrate Dashboard.tsx. Based on detection:
- Transform <div> to <View> (12 instances)
- Replace localStorage with AsyncStorage (3 instances)
- Convert className to StyleSheet (8 instances)
- Replace react-router with @react-navigation
```

## Integration with Codemod

These tools are designed to work with the codemod scope subagent:

1. **Scope phase**: Uses these tools to detect patterns
2. **Planning phase**: Determines which migration guides apply
3. **Execution phase**: Applies transformations based on guides

## Benefits Over Grep

✅ **Deterministic** - AST parsing eliminates false positives
✅ **Context-aware** - Knows if code is in strings, comments, etc.
✅ **Structured output** - Returns actionable data with line numbers
✅ **Type-safe** - Understands TypeScript types and JSX
✅ **Comprehensive** - Finds nested patterns Grep would miss

## Limitations

- **JS/TS only** - Won't work on CSS, HTML, config files (use Grep for those)
- **Parsing errors** - Syntax errors in source will cause tool to fail
- **Performance** - Slower than Grep for simple text searches

## Troubleshooting

### "ts-morph not found"
```bash
npm install -g ts-morph
```

### Tool not showing up in Amp
```bash
# Check AMP_TOOLBOX is set
echo $AMP_TOOLBOX

# Verify tools are executable
ls -la .amp/tools/
# All should have -rwxr-xr-x permissions
```

### JSON parse errors
Ensure you're passing valid JSON to the tools. Amp handles this automatically.
