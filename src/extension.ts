// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// import { workspace } from "vscode";

import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
} from "vscode-languageclient/node";

let client: LanguageClient;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(_context: vscode.ExtensionContext) {
  // Options to control the language client
  //
  const serverOptions: Executable = {
    command: "mix",
    args: ["credo.lsp", "--stdio"],
  };
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: "file", language: "elixir" }],
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "elixir-tools.credo",
    "Credo",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
