import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "mariostsrs.opencode-sidebar-superterminal";

suite("OpenCode Sidebar Terminal Extension", () => {
  test("VS Code API is available", () => {
    assert.ok(vscode);
  });

  test("Extension should be present", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);

    assert.ok(
      extension,
      `Expected extension ${EXTENSION_ID} to be installed`,
    );
  });

  test("Extension should activate", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);

    assert.ok(extension, "Extension not found");

    await extension.activate();

    assert.strictEqual(extension.isActive, true);
  });

  test("OpenCode terminal view command should exist", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(
      commands.includes("opencodeSuperTerminalView.focus"),
      "Expected opencodeSuperTerminalView.focus command to exist",
    );
  });

  test("OpenCode terminal view focus command should remain available after activation", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);

    assert.ok(extension, "Extension not found");

    await extension.activate();

    const commands = await vscode.commands.getCommands(true);

    assert.ok(
      commands.includes("opencodeSuperTerminalView.focus"),
      "Expected opencodeSuperTerminalView.focus command to remain available after activation",
    );
  });
});
