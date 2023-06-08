import * as vscode from "vscode";

import fetch from 'node-fetch';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";

let credoClient: LanguageClient;

async function latestRelease(): Promise<string> {
  return fetch("https://api.github.com/repos/elixir-tools/credo-language-server/releases/latest", {headers: {["X-GitHub-Api-Version"]: "2022-11-28", ["Accept"]: "application/vnd.github+json"}})
  .then(x => x.json())
  .then((x: any): string => x.tag_name.replace(/^v/, ""));
}

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
              options: {
                env: Object.assign({}, process.env, { ["CREDO_LSP_VERSION"]: await latestRelease() })
              },
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
