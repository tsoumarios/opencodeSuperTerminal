package com.mariostsrs.opencode

import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.jediterm.terminal.ProcessTtyConnector
import com.jediterm.terminal.TerminalColor
import com.jediterm.terminal.TextStyle
import com.jediterm.terminal.TtyConnector
import com.jediterm.terminal.emulator.ColorPaletteImpl
import com.jediterm.terminal.ui.JediTermWidget
import com.jediterm.terminal.ui.settings.DefaultSettingsProvider
import com.pty4j.PtyProcessBuilder
import com.pty4j.WinSize
import java.awt.Dimension
import java.nio.charset.StandardCharsets
import javax.swing.JComponent

/**
 * Creates and manages a JediTerm terminal widget connected to a pty4j PTY process
 * that runs the `opencode` CLI. Mirrors the VS Code extension behaviour:
 *   - workspace-aware CWD (project base path)
 *   - platform-detected shell (SHELL on Unix, ComSpec on Windows)
 *   - spawns: `<shell> -c opencode`  /  `<shell> /k opencode`
 *   - kills the PTY process when the parent Disposable is disposed
 */
class OpenCodeTerminalRunner(
    private val project: Project,
    parentDisposable: Disposable
) {
    companion object {
        private val LOG = Logger.getInstance(OpenCodeTerminalRunner::class.java)
    }

    /** The Swing component to embed in the tool window. */
    val component: JComponent

    init {
        val widget = createTerminalWidget(parentDisposable)
        component = widget

        try {
            val connector = createTtyConnector(parentDisposable)
            widget.createTerminalSession(connector)
            widget.start()
        } catch (e: Exception) {
            LOG.error("Failed to start OpenCode terminal process", e)
        }
    }

    // -------------------------------------------------------------------------
    // Terminal widget
    // -------------------------------------------------------------------------

    private fun createTerminalWidget(disposable: Disposable): JediTermWidget {
        val settings = OpenCodeSettingsProvider()
        val widget = JediTermWidget(settings)
        // Shut the widget down when the tool window is disposed
        Disposer.register(disposable) { widget.close() }
        return widget
    }

    // -------------------------------------------------------------------------
    // PTY process + connector
    // -------------------------------------------------------------------------

    private fun createTtyConnector(parentDisposable: Disposable): TtyConnector {
        val cwd = project.basePath ?: System.getProperty("user.home")
        val isWindows = System.getProperty("os.name").lowercase().contains("win")

        val shell = if (isWindows) {
            System.getenv("ComSpec") ?: "cmd.exe"
        } else {
            System.getenv("SHELL") ?: "/bin/sh"
        }

        // Same launch strategy as the VS Code extension:
        //   Unix  →  $SHELL -c opencode
        //   Win   →  %ComSpec% /k opencode
        val command = if (isWindows) {
            arrayOf(shell, "/k", "opencode")
        } else {
            arrayOf(shell, "-c", "opencode")
        }

        val env = buildMap<String, String> {
            putAll(System.getenv())
            put("TERM", "xterm-256color")
            put("COLORTERM", "truecolor")
        }

        LOG.info("OpenCode: spawning ${command.toList()} in $cwd")

        val process = PtyProcessBuilder()
            .setCommand(command)
            .setDirectory(cwd)
            .setEnvironment(env)
            .setConsole(false)
            .setInitialColumns(120)
            .setInitialRows(40)
            .start()

        LOG.info("OpenCode terminal started (PID ${process.pid()})")

        // Ensure process is killed when the tool window is closed / IDE exits
        Disposer.register(parentDisposable) {
            if (process.isAlive) {
                process.destroyForcibly()
                LOG.info("OpenCode terminal process destroyed")
            }
        }

        return OpenCodeTtyConnector(process)
    }
}

// -----------------------------------------------------------------------------
// TtyConnector — bridges pty4j PtyProcess with JediTerm
// -----------------------------------------------------------------------------

/**
 * Wraps a [com.pty4j.PtyProcess] so JediTerm can read/write data and handle
 * terminal resize events.
 */
private class OpenCodeTtyConnector(
    private val ptyProcess: com.pty4j.PtyProcess
) : ProcessTtyConnector(ptyProcess, StandardCharsets.UTF_8) {

    override fun getName(): String = "OpenCode"

    override fun isConnected(): Boolean = ptyProcess.isAlive

    /** Called by JediTerm when the widget is resized. */
    override fun resize(terminalSize: Dimension) {
        if (ptyProcess.isAlive) {
            ptyProcess.winSize = WinSize(terminalSize.width, terminalSize.height)
        }
    }
}

// -----------------------------------------------------------------------------
// Settings provider — sensible defaults matching the VS Code extension
// -----------------------------------------------------------------------------

/**
 * Terminal appearance settings. Enforces a dark theme (dark background,
 * light foreground) so the terminal always looks correct regardless of the
 * IDE's own Light/Dark theme selection, and uses the standard xterm-256
 * colour palette for accurate colour output.
 */
private class OpenCodeSettingsProvider : DefaultSettingsProvider() {

    // Dark background (#1E1E1E) + light foreground (#D4D4D4) — matches the
    // VS Code extension theme and opencode's own colour scheme.
    override fun getDefaultStyle(): TextStyle = TextStyle(
        TerminalColor.rgb(212, 212, 212),  // foreground: #D4D4D4
        TerminalColor.rgb(30, 30, 30)      // background: #1E1E1E
    )

    // Use the standard xterm 256-colour palette for accurate ANSI colours.
    override fun getTerminalColorPalette() = ColorPaletteImpl.XTERM_PALETTE

    override fun audibleBell(): Boolean = false
}
