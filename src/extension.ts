// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import type { IPty } from "node-pty";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "opencodeSuperTerminalView",
        new OpenCodeTerminalProvider(context.extensionUri),
      ),
    );

    console.log('Extension "opencode-sidebar-superterminal" is now active!');
    vscode.window.showInformationMessage("OpenCode SuperTerminal activated!");
  } catch (err) {
    console.error("Failed to activate opencode-sidebar-superterminal:", err);
    vscode.window.showErrorMessage(
      `OpenCode SuperTerminal failed to activate: ${err}`,
    );
  }
}

class OpenCodeTerminalProvider implements vscode.WebviewViewProvider {
  private ptyProcess?: IPty;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "node_modules", "@xterm"),
      ],
    };

    const xtermCss = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@xterm",
        "xterm",
        "css",
        "xterm.css",
      ),
    );
    const xtermJs = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@xterm",
        "xterm",
        "lib",
        "xterm.js",
      ),
    );
    const fitAddonJs = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@xterm",
        "addon-fit",
        "lib",
        "addon-fit.js",
      ),
    );
    const unicode11Js = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@xterm",
        "addon-unicode11",
        "lib",
        "addon-unicode11.js",
      ),
    );
    const canvasAddonJs = view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@xterm",
        "addon-canvas",
        "lib",
        "addon-canvas.js",
      ),
    );

    view.webview.html = this.getHtml(
      view.webview,
      xtermCss,
      xtermJs,
      fitAddonJs,
      unicode11Js,
      canvasAddonJs,
    );

    // Load node-pty: prefer VS Code's bundled version (compiled for Electron),
    // fall back to local node_modules
    let pty: typeof import("node-pty");
    try {
      const vscodePath = require.resolve("node-pty", {
        paths: [require("path").join(vscode.env.appRoot, "node_modules")],
      });
      pty = require(vscodePath);
    } catch {
      try {
        pty = require("node-pty");
      } catch (err) {
        const msg = `Failed to load node-pty: ${err}`;
        console.error(msg);
        vscode.window.showErrorMessage(msg);
        view.webview.postMessage({
          type: "output",
          data: `\r\nError: ${msg}\r\n`,
        });
        return;
      }
    }

    const cwd =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
      process.env.USERPROFILE ??
      process.env.HOME ??
      process.cwd();

    try {
      const isWindows = process.platform === "win32";
      const shell = isWindows
        ? process.env.ComSpec || "cmd.exe"
        : process.env.SHELL || "/bin/sh";
      const shellArgs = isWindows ? ["/k", "opencode"] : ["-c", "opencode"];

      this.ptyProcess = pty.spawn(shell, shellArgs, {
        name: "xterm-256color",
        cols: 80,
        rows: 30,
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        } as Record<string, string>,
      });
    } catch (err) {
      const msg = `Failed to spawn terminal: ${err}`;
      console.error(msg);
      vscode.window.showErrorMessage(msg);
      view.webview.postMessage({
        type: "output",
        data: `\r\nError: ${msg}\r\n`,
      });
      return;
    }

    this.ptyProcess.onData((data: string) => {
      view.webview.postMessage({
        type: "output",
        data,
      });
    });

    view.webview.onDidReceiveMessage((message: any) => {
      if (message.type === "input") {
        this.ptyProcess?.write(message.data);
      }

      if (message.type === "resize") {
        this.ptyProcess?.resize(message.cols, message.rows);
      }
    });

    view.onDidDispose(() => {
      this.ptyProcess?.kill();
    });
  }

  private getHtml(
    webview: vscode.Webview,
    xtermCss: vscode.Uri,
    xtermJs: vscode.Uri,
    fitAddonJs: vscode.Uri,
    unicode11Js: vscode.Uri,
    canvasAddonJs: vscode.Uri,
  ): string {
    const nonce = getNonce();
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}' ${webview.cspSource};">
  <style nonce="${nonce}">
    html, body, #terminal {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1e1e1e;
    }
    #error { color: red; padding: 10px; font-family: monospace; display: none; }
    .xterm { height: 100%; }
  </style>

  <link rel="stylesheet" href="${xtermCss}" />
</head>
<body>
  <div id="error"></div>
  <div id="terminal"></div>

  <script nonce="${nonce}" src="${xtermJs}"></script>
  <script nonce="${nonce}" src="${fitAddonJs}"></script>
  <script nonce="${nonce}" src="${unicode11Js}"></script>
  <script nonce="${nonce}" src="${canvasAddonJs}"></script>

  <script nonce="${nonce}">
    const errEl = document.getElementById('error');
    function showError(msg) {
      errEl.style.display = 'block';
      errEl.textContent += msg + '\\n';
    }

    try {
      if (typeof Terminal === 'undefined') {
        showError('ERROR: xterm.js failed to load');
        throw new Error('xterm not loaded');
      }
      if (typeof FitAddon === 'undefined') {
        showError('ERROR: FitAddon failed to load');
        throw new Error('FitAddon not loaded');
      }

    const vscode = acquireVsCodeApi();

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      allowProposedApi: true,
      scrollback: 1000,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4'
      }
    });

    const fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);

    const unicode11Addon = new Unicode11Addon.Unicode11Addon();
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = '11';

    try {
      const canvasAddon = new CanvasAddon.CanvasAddon();
      terminal.loadAddon(canvasAddon);
    } catch(e) {
      console.warn('Canvas addon failed, using default renderer:', e);
    }

    terminal.open(document.getElementById('terminal'));
    fitAddon.fit();
    terminal.focus();

    terminal.onData(data => {
      vscode.postMessage({ type: 'input', data });
    });

    window.addEventListener('message', event => {
      const message = event.data;

      if (message.type === 'output') {
        terminal.write(message.data);
      }
    });

    function resize() {
      fitAddon.fit();

      vscode.postMessage({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows
      });
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 300);

    } catch(e) {
      showError('Terminal init error: ' + e.message);
    }
  </script>
</body>
</html>
`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
