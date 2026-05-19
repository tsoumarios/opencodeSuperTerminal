# OpenCode SuperTerminal — IntelliJ

Run [OpenCode](https://opencode.ai/) directly inside a dedicated **right-side tool window** in any JetBrains IDE — no need to switch to the built-in terminal panel.

Compatible with **all IntelliJ-based IDEs**: Rider, IntelliJ IDEA, WebStorm, PyCharm, GoLand, and more.

![Screenshot of OpenCode SuperTerminal for IntelliJ](https://raw.githubusercontent.com/tsoumarios/opencodeSuperTerminal/master/opencodeSuperTerminal-Intellij/src/main/resources/icons/Screenshot.png)

## Features

- **Right-sidebar tool window** — A persistent terminal lives in a dedicated panel, keeping the bottom area free for other tasks.
- **Auto-launches OpenCode** — The plugin spawns `opencode` automatically when the tool window is opened; no manual commands needed.
- **Full terminal emulation** — Powered by [JediTerm](https://github.com/JetBrains/jediterm) (bundled with the IDE) with 256-color / true-color output, cursor blink, Unicode support, and scrollback.
- **Auto-resize** — The terminal automatically adjusts its dimensions when the panel is resized.
- **Workspace-aware** — Opens in the current project's base directory.

## Requirements

| Requirement      | Details |
|------------------|---------|
| **JetBrains IDE** | Any IntelliJ-based IDE 2024.1 or later (Rider, IDEA, WebStorm, PyCharm, …) |
| **OpenCode CLI** | Must be installed and available on your `PATH`. Install from [opencode.ai](https://opencode.ai/). |
| **OS** | Windows, macOS, and Linux. Shell is resolved from `$SHELL` on Unix and `%ComSpec%` on Windows. |

## How It Works

1. The plugin registers an **OpenCode** tool window on the right side of the IDE via `plugin.xml`.
2. When the tool window is opened, `OpenCodeToolWindowFactory` creates a `JediTermWidget` and an `OpenCodeTerminalRunner`.
3. The runner:
   - Resolves the project's base directory as the working directory.
   - Detects the platform shell (`$SHELL` / `%ComSpec%`).
   - Spawns a PTY process via **pty4j** (bundled with IntelliJ) running `<shell> -c opencode` (Unix) or `<shell> /k opencode` (Windows).
   - Bridges the PTY ↔ JediTerm widget for full interactive terminal I/O.
4. On tool window close or IDE exit, the PTY process is killed automatically.

## Installing

### Option A — Install from a Release (recommended for users)

1. Go to the [Releases page](https://github.com/tsoumarios/opencodeSuperTerminal/releases) and download the latest `opencode-superterminal-*.zip`.
2. Open your JetBrains IDE (Rider, IDEA, WebStorm, PyCharm, …).
3. Open **Settings** (`Ctrl+Alt+S` / `Cmd+,` on macOS) → **Plugins**.
4. Click the **⚙ gear icon** at the top of the Plugins panel.
5. Choose **Install Plugin from Disk…**
6. Select the downloaded `.zip` file and click **OK**.
7. Click **Restart IDE** when prompted.

After restart, the **OpenCode** tool window appears in the right sidebar strip. Click it to open the panel — `opencode` launches automatically in your project directory.

> **Tip:** If the tool window is not visible, go to **View → Tool Windows → OpenCode**.

### Option B — Build from source

Requires JDK 17+.

```bash
git clone https://github.com/tsoumarios/opencodeSuperTerminal.git
cd opencodeSuperTerminal/opencodeSuperTerminal-Intellij
./gradlew buildPlugin
# Output: build/distributions/opencode-superterminal-1.2.0.zip
```

Then follow steps 2–7 from Option A to install the produced `.zip`.

## Building & Development

```bash
# Build the plugin zip (output: build/distributions/)
./gradlew buildPlugin

# Run in a sandboxed IDE for development/testing
./gradlew runIde

# Verify plugin compatibility
./gradlew verifyPlugin
```

## Known Issues

- If `opencode` is not on `PATH`, the terminal will stay open and show the shell error. You can then run `opencode` manually from the prompt.
- The tool window icon may appear monochrome in older IDE themes.

## License

See [LICENSE](../opencodeSuperTerminal-VsCode/LICENSE) for details.
