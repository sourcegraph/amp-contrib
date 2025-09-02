# Amp Toolbox Templates

Templates for creating custom tools that extend Amp. See the [Amp Owner's Manual](https://ampcode.com/manual#toolboxes) for complete documentation.

## Quick Start

1. **Set up your toolbox directory:**

   ```bash
   export AMP_TOOLBOX=/path/to/your/toolbox
   mkdir -p $AMP_TOOLBOX
   ```

2. **Copy and customize a template:**

   ```bash
   cp tool-template.js $AMP_TOOLBOX/my-custom-tool
   chmod +x $AMP_TOOLBOX/my-custom-tool
   ```

3. **Edit the template:**
   - Update `name` and `description`
   - Modify parameters and logic

## Available Templates

### Basic Templates

- **`tool-template.js`** - Node.js with simple key-value parameters
- **`tool-template.py`** - Python with simple key-value parameters  
- **`tool-template.sh`** - Bash with simple key-value parameters
- **`tool-template-json.js`** - Node.js with JSON schema for complex parameters

## Testing Toolbox Implementations

Test the `describe` action:

```bash
# JavaScript template
TOOLBOX_ACTION=describe ./tool-template.js

# Python template  
TOOLBOX_ACTION=describe ./tool-template.py

# Bash template
TOOLBOX_ACTION=describe ./tool-template.sh

# JSON schema template
TOOLBOX_ACTION=describe ./tool-template-json.js
```

Test the `execute` action:

```bash
# Simple templates (external service integration)
echo "text: hello world" | TOOLBOX_ACTION=execute ./tool-template.js
echo "text: hello world" | TOOLBOX_ACTION=execute ./tool-template.py  
echo "text: hello world" | TOOLBOX_ACTION=execute ./tool-template.sh

# JSON template (complex data to external service)
echo '{"files": ["test.txt", "data.csv"], "options": {"verbose": true, "format": "json", "priority": 8}}' | TOOLBOX_ACTION=execute ./tool-template-json.js
```
