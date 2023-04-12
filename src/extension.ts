import * as vscode from "vscode";

import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
} from "vscode-languageclient/node";

let credoClient: LanguageClient;

export async function activate(_context: vscode.ExtensionContext) {
  let files = await vscode.workspace.findFiles("mix.exs");

  let config = vscode.workspace.getConfiguration("elixir-tools.credo");

  if (files[0]) {
    let text = await vscode.workspace.fs.readFile(files[0]);

    if (text.toString().includes("{:credo")) {
      if (config.get("enabled")) {
        const serverOptions: Executable = {
          command: "mix",
          args: ["credo.lsp", "--stdio"],
        };
        const clientOptions: LanguageClientOptions = {
          documentSelector: [{ scheme: "file", language: "elixir" }],
        };

        credoClient = new LanguageClient(
          "elixir-tools.credo",
          "Credo",
          serverOptions,
          clientOptions
        );

        // Start the credoClient. This will also launch the server
        credoClient.start();
      }
    }
  }
}

export function deactivate() {
  if (!credoClient) {
    return undefined;
  }
  return credoClient.stop();
}
