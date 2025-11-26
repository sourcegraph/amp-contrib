# Amp Sandbox Configuration

Sandbox configuration for running [Amp](https://ampcode.com) with filesystem and network restrictions using [srt](https://github.com/anthropic-experimental/sandbox-runtime).

## What is srt?

A lightweight sandboxing tool that enforces filesystem and network restrictions on arbitrary processes at the OS level, without requiring containers. It uses native OS sandboxing primitives (`sandbox-exec` on macOS, `bubblewrap` on Linux) and proxy-based network filtering.

## Setup

1. Install srt: https://github.com/anthropic-experimental/sandbox-runtime
2. Run Amp with the sandbox:
   ```sh
   srt --settings amp-srt-settings.json -- amp
   ```

## Configuration

The `amp-srt-settings.json` file provides a baseline policy that:

- **Network**: Allows connections required by Amp while blocking everything else
- **Filesystem**: Restricts write access to the working directory, config directories, and temp folders

Treat this as a starting point and modify it as appropriate for your needs.

## Limitations

- **Amp's `read_web_page` tool**: Runs server-side, so network sandboxing doesn't affect it. Disable this tool locally if you need strict network isolation.
- **iTerm**: Known bug where the terminal window hides when Amp starts under srt.
