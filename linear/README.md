# Linear Tools for Amp

Linear integration tools for the Amp coding assistant, implemented as an [Amp toolbox](https://ampcode.com/manual#toolboxes).

## What is this?

This is an Amp **toolbox** - a collection of executable scripts that extend Amp's capabilities. Unlike MCP servers, toolboxes are simple scripts that Amp can discover and execute automatically. Each tool handles two actions:

- **`describe`**: When `TOOLBOX_ACTION=describe`, the script outputs tool metadata (name, description) to help Amp understand what it can do
- **`execute`**: When `TOOLBOX_ACTION=execute`, the script receives parameters via stdin and performs the actual work

## Setup

**⚠️ IMPORTANT: You must set your Linear API key before using these tools.**

1. Install dependencies:
```bash
bun install
```

2. **Set your Linear API key** (required):
```bash
export LINEAR_API_KEY=your_linear_api_key_here
```

To make this permanent, add the export to your shell profile (`.bashrc`, `.zshrc`, etc.).

## Usage

### Option 1: Project-local usage

1. Build the tools:
```bash
bun run build
```
   
   Or alternatively:
```bash
./build.sh
```

2. Set the toolbox environment variable:
```bash
export AMP_TOOLBOX=$(pwd)/.agents/tools
```

### Option 2: Install to central toolbox directory (recommended)

1. Build the tools:
```bash
bun run build
```

2. Create a central toolbox directory and copy the executables:
```bash
mkdir -p ~/.local/bin/amp-tools
cp .agents/tools/* ~/.local/bin/amp-tools/
```

3. Set the toolbox environment variable to point to your central directory:
```bash
export AMP_TOOLBOX=~/.local/bin/amp-tools
```

You can add this export to your shell profile (`.bashrc`, `.zshrc`, etc.) to make it permanent.

**Note:** These tools require the `LINEAR_API_KEY` environment variable to be set. If not set, the tools will exit with an error message.

Once configured, Amp will automatically discover and make these tools available:
- `linear_get_issue` - Retrieve issue details from Linear using issue ID
- `linear_add_bugfix_comment` - Add a bugfix comment to a Linear issue with commit and branch details

### Managing multiple toolboxes

The central directory approach allows you to combine tools from multiple toolbox projects:

```bash
# Install Linear tools
cd /path/to/linear-tools
bun run build && cp .agents/tools/* ~/.local/bin/amp-tools/

# Install other toolboxes
cd /path/to/other-tools
bun run build && cp .agents/tools/* ~/.local/bin/amp-tools/

# Set once, use everywhere
export AMP_TOOLBOX=~/.local/bin/amp-tools
```

## How it works

Each tool is implemented as an executable script in the `.agents/tools/` directory. When Amp starts:

1. It sets `TOOLBOX_ACTION=describe` and runs each executable to learn about available tools
2. When you use a tool, Amp sets `TOOLBOX_ACTION=execute` and passes parameters via stdin
3. The script performs the requested action and returns results

This toolbox approach provides a lightweight way to add Linear integration without complex setup.

## Tools

### linear_get_issue
Retrieves detailed information about a Linear issue.

**Parameters:**
- `issue_id` (string) - The Linear issue ID to retrieve

**Example usage in Amp:**
```
Get details for Linear issue ABC-123
```

### linear_add_bugfix_comment
Adds a structured bugfix comment to a Linear issue with commit and branch information.

**Parameters:**
- `issue_id` (string) - The Linear issue ID to comment on
- `commit_id` (string) - The commit ID of the bugfix
- `branch_name` (string) - The branch name where the fix was applied  
- `comment` (string, optional) - Additional comment details

**Example usage in Amp:**
```
Add a bugfix comment to Linear issue ABC-123 for commit def456 on branch fix/user-login
```
