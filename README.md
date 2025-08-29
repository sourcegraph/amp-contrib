# amp-contrib

This repository contains unofficial
[slash commands](https://ampcode.com/news/custom-slash-commands) and
[toolbox](https://ampcode.com/manual#toolboxes) tools that are not built-in to
the [Amp](https://ampcode.com) agentic coding tool.

## Slash commands

Slash commands allow allow you to insert pre-defined or dynamically-generated
text into the prompt input.

They are defined in a repository's `.agents/commands` directory and can be
markdown files or use Amp's experimental
support for executable scripts, which begin with, for example `#!/usr/bin/env bash`

## Toolboxes

Toolboxes allow you to extend Amp with simple scripts instead of needing to
provide an MCP server.

They are defined in a repository's `.agents/tools` directory.

For more information on toolboxes, see the [Amp Owners Manual](https://ampcode.com/manual#toolboxes)
