# OpenCode SuperTerminal

Run [OpenCode](https://opencode.ai/) directly inside your favourite IDE — no terminal panel switching needed.

This repository contains IDE-specific plugin implementations that each embed a fully interactive terminal in a sidebar/tool window and automatically launch the `opencode` CLI when opened.

## Projects

| Project | IDE | Description |
|---------|-----|-------------|
| [`opencodeSuperTerminal-VsCode`](./opencodeSuperTerminal-VsCode/README.md) | Visual Studio Code | Embeds an xterm.js terminal in the Explorer sidebar via a WebviewViewProvider |
| [`opencodeSuperTerminal-Intellij`](./opencodeSuperTerminal-Intellij/README.md) | All IntelliJ-based IDEs (Rider, IDEA, WebStorm, PyCharm, …) | Embeds a JediTerm terminal in a right-side tool window via the IntelliJ Platform SDK |

## Requirements

All plugins require the `opencode` CLI to be installed and available on your `PATH`.
Install from [opencode.ai](https://opencode.ai/).

## License

See the `LICENSE` file inside each project for details.
