package com.mariostsrs.opencode

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

/**
 * Factory that creates the OpenCode SuperTerminal tool window content.
 * Registered via plugin.xml as a right-anchor tool window.
 */
class OpenCodeToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val disposable = Disposer.newDisposable("OpenCodeSuperTerminal")
        Disposer.register(toolWindow.disposable, disposable)

        val runner = OpenCodeTerminalRunner(project, disposable)

        val content = ContentFactory.getInstance()
            .createContent(runner.component, "", false)
        content.isCloseable = false

        toolWindow.contentManager.addContent(content)
    }
}
