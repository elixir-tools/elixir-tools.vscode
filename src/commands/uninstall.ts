import * as vscode from "vscode";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

let binName;

if (os.platform() == "win32") {
  binName = "nextls.exe";
} else {
  binName = "nextls";
}

export const run = async (cacheDir: string) => {
  if (cacheDir[0] === "~") {
    cacheDir = path.join(os.homedir(), cacheDir.slice(1));
  }
  const bin = path.join(cacheDir, binName);
  await fsp
    .rm(bin)
    .then(
      async () =>
        await vscode.window.showInformationMessage(
          `Uninstalled Next LS from ${bin}`
        )
    )
    .catch(
      async (error) =>
        await vscode.window.showErrorMessage(
          `Failed to uninstall Next LS from ${bin} due to ${error}`
        )
    );
};

function registerUninstallCommand(
  config: vscode.WorkspaceConfiguration,
  context: vscode.ExtensionContext
) {
  const uninstallCommand = "elixir-tools.uninstall-nextls";

  const uninstall = async () =>
    run(<string>config.get("installationDirectory"));

  context.subscriptions.push(
    vscode.commands.registerCommand(uninstallCommand, uninstall)
  );
}

export default registerUninstallCommand;
