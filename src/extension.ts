import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";

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
  _context: vscode.ExtensionContext,
  _mixfile: vscode.Uri
) {
  let config = vscode.workspace.getConfiguration("elixir-tools.nextls");

  if (config.get("enable")) {
    let serverOptions: ServerOptions;

    switch (config.get("adapter")) {
      case "stdio":
        const command = await ensureNextLSDownloaded(
          config.get("installationDirectory")!,
          { force: false }
        );

        serverOptions = {
          command,
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
      documentSelector: [
        { scheme: "file", language: "elixir" },
        { scheme: "file", language: "surface" },
        { scheme: "file", language: "phoenix-heex" },
      ],
    };

    console.log(serverOptions);

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

async function ensureNextLSDownloaded(
  cacheDir: string,
  opts: { force?: boolean } = {}
): Promise<string> {
  if (cacheDir[0] === "~") {
    cacheDir = path.join(os.homedir(), cacheDir.slice(1));
  }
  console.log(cacheDir);

  const bin = path.join(cacheDir, "nextls");

  const shouldDownload = opts.force || (await isBinaryMissing(bin));
  console.log(shouldDownload);

  if (shouldDownload) {
    await fsp.mkdir(cacheDir, { recursive: true });

    const arch = os.arch();
    const platform = getPlatform();
    const url = `https://github.com/elixir-tools/next-ls/releases/latest/download/next_ls_${platform}_${arch}`;

    const shouldInstall = await vscode.window.showInformationMessage(
      "Install Next LS?",
      { modal: true, detail: `Downloading to '${cacheDir}'` },
      "Yes"
    );

    if (shouldInstall !== "Yes") {
      throw new Error("Could not activate Next LS");
    }

    console.log(`Fetching Next LS: ${url}`);

    await fetch(url).then((res) =>
      new Promise((resolve, reject) => {
        const file = fs.createWriteStream(bin);
        res.body?.pipe(file);
        file.on("close", resolve);
        file.on("error", reject);
      })
        .then(() => console.log("Downloaded NextLS!!"))
        .catch(() => console.log("Failed to download NextLS!!"))
    );
    await fsp.chmod(bin, 755);
  }

  return bin;
}

async function isBinaryMissing(bin: string) {
  try {
    await fsp.access(bin, fs.constants.X_OK);
    return false;
  } catch {
    return true;
  }
}

function getPlatform() {
  switch (os.platform()) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }
}
