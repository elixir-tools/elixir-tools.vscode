import * as vscode from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";

let credoClient: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
  let files = await vscode.workspace.findFiles("mix.exs");

  let config = vscode.workspace.getConfiguration("elixir-tools.credo");

  if (files[0]) {
    let text = await vscode.workspace.fs.readFile(files[0]);

    if (text.toString().includes("{:credo")) {
      if (config.get("enable")) {
        let serverOptions: ServerOptions;

        switch (config.get("adapter")) {
          case "stdio":
            serverOptions = {
              command: context.asAbsolutePath("./bin/credo-language-server"),
              args: ["--stdio"],
            };
            break;
          case "tcp":
            serverOptions = () => {
              // Connect to language server via socket
              let socket = require("net").connect({host: "127.0.0.1", port: config.get("port")});
              let result: StreamInfo = {
                writer: socket,
                reader: socket,
              };
              return Promise.resolve(result);
            };
            break;
          default:
            throw new Error("boom");
        }
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
