import * as vscode from "vscode";

import fetch from "node-fetch";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from "vscode-languageclient/node";

let credoClient: LanguageClient;
let nextLSClient: LanguageClient;

async function latestRelease(project: string): Promise<string> {
  return fetch(
    `https://api.github.com/repos/elixir-tools/${project}/releases/latest`,
    {
      headers: {
        ["X-GitHub-Api-Version"]: "2022-11-28",
        ["Accept"]: "application/vnd.github+json",
      },
    }
  )
    .then((x) => x.json())
    .then((x: any): string => x.tag_name.replace(/^v/, ""));
}

async function activateCredo(
  context: vscode.ExtensionContext,
  mixfile: vscode.Uri
) {
  let config = vscode.workspace.getConfiguration("elixir-tools.credo");
  let text = await vscode.workspace.fs.readFile(mixfile);

  if (text.toString().includes("{:credo")) {
    if (config.get("enable")) {
      let serverOptions: ServerOptions;

      switch (config.get("adapter")) {
        case "stdio":
          let version = config.get("version");

          if (version === "latest") {
            version = await latestRelease("credo-language-server");
          }

          serverOptions = {
            options: {
              env: Object.assign({}, process.env, {
                ["CREDO_LSP_VERSION"]: version,
              }),
            },
            command: context.asAbsolutePath("./bin/credo-language-server"),
            args: ["--stdio"],
          };
          break;
        case "tcp":
          serverOptions = () => {
            // Connect to language server via socket
            let socket = require("net").connect({
              host: "127.0.0.1",
              port: config.get("port"),
            });
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

async function activateNextLS(
  context: vscode.ExtensionContext,
  _mixfile: vscode.Uri
) {
  let config = vscode.workspace.getConfiguration("elixir-tools.nextls");

  if (config.get("enable")) {
    let serverOptions: ServerOptions;

    switch (config.get("adapter")) {
      case "stdio":
        let version = config.get("version");

        if (version === "latest") {
          version = await latestRelease("next-ls");
        }

        serverOptions = {
          options: {
            env: Object.assign({}, process.env, {
              ["NEXTLS_VERSION"]: version,
            }),
          },
          command: context.asAbsolutePath("./bin/nextls"),
          args: ["--stdio"],
        };
        break;
      case "tcp":
        serverOptions = () => {
          // Connect to language server via socket
          let socket = require("net").connect({
            host: "127.0.0.1",
            port: config.get("port"),
          });
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

    nextLSClient = new LanguageClient(
      "elixir-tools.nextls",
      "NextLS",
      serverOptions,
      clientOptions
    );

    // Start the nextLSClient. This will also launch the server
    nextLSClient.start();
  }
}

export async function activate(context: vscode.ExtensionContext) {
  let files = await vscode.workspace.findFiles("mix.exs");

  if (files[0]) {
    await activateCredo(context, files[0]);
    await activateNextLS(context, files[0]);
  }
}

export function deactivate() {
  if (!credoClient && !nextLSClient) {
    return undefined;
  }
  if (credoClient) {
    credoClient.stop();
  }

  if (nextLSClient) {
    nextLSClient.stop();
  }

  return true;
}
