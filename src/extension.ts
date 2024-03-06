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

import registerUninstallCommand from "./commands/uninstall";
import registerToPipeCommand from "./commands/to-pipe";
import registerFromPipeCommand from "./commands/from-pipe";

let credoClient: LanguageClient;
let nextLSClient: LanguageClient;

const channel = vscode.window.createOutputChannel("elixir-tools.vscode", {
  log: true,
});

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

// In case the auto updater gets busted, we want the ability to force a download.
// By incremented the key here, we should be able to force a download when the extension updates.
export function forceDownload(context: vscode.ExtensionContext): boolean {
  let forceDownload: boolean = context.globalState.get(
    "elixir-tools-force-next-ls-download-v1"
  );
  channel.info(
    `value of elixir-tools-force-next-ls-download-v1: ${forceDownload}`
  );
  if (forceDownload === undefined) {
    forceDownload = true;
  }

  context.globalState.update("elixir-tools-force-next-ls-download-v1", false);

  return forceDownload;
}

async function activateNextLS(
  context: vscode.ExtensionContext,
  _mixfile: vscode.Uri
) {
  channel.info("activating next ls");
  let config = vscode.workspace.getConfiguration("elixir-tools.nextLS");

  if (config.get("enable")) {
    let serverOptions: ServerOptions;

    switch (config.get("adapter")) {
      case "stdio":
        let cacheDir: string = config.get("installationDirectory")!;
        if (cacheDir[0] === "~") {
          cacheDir = path.join(os.homedir(), cacheDir.slice(1));
        }
        const command = await ensureNextLSDownloaded(cacheDir, {
          force: forceDownload(context),
        });

        serverOptions = {
          options: {
            env: Object.assign({}, process.env, {
              ["NEXTLS_AUTO_UPDATE"]: true,
              ["NEXTLS_SPITFIRE_ENABLED"]: config.get("spitfire") ? 1 : 0,
            }),
          },
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
      initializationOptions: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mix_env: config.get("MIX_ENV"),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        mix_target: config.get("MIX_TARGET"),
        experimental: config.get("experimental"),
        extensions: config.get("extensions"),
      },
      documentSelector: [
        { scheme: "file", language: "elixir" },
        { scheme: "file", language: "surface" },
        { scheme: "file", language: "phoenix-heex" },
      ],
    };

    nextLSClient = new LanguageClient(
      "elixir-tools.nextLS",
      "Next LS",
      serverOptions,
      clientOptions
    );

    registerToPipeCommand(nextLSClient, context);
    registerFromPipeCommand(nextLSClient, context);
    registerUninstallCommand(config, context);

    // Start the nextLSClient. This will also launch the server
    nextLSClient.start();
  }
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<vscode.ExtensionContext> {
  let files = await vscode.workspace.findFiles("mix.exs");
  channel.info(`files: ${files[0]}`);

  if (files[0]) {
    await activateCredo(context, files[0]);
    await activateNextLS(context, files[0]);
  }

  return context;
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

export async function ensureNextLSDownloaded(
  cacheDir: string,
  opts: { force?: boolean } = {}
): Promise<string> {
  let bin: string;
  if (os.platform() === "win32") {
    bin = path.join(cacheDir, "nextls.exe");
  } else {
    bin = path.join(cacheDir, "nextls");
  }

  const shouldDownload = opts.force || (await isBinaryMissing(bin));

  if (shouldDownload) {
    channel.info("Next LS needs to be downloaded");
    await fsp.mkdir(cacheDir, { recursive: true });

    const platform = getPlatform();
    const exe = getExe(platform);
    const url = `https://github.com/elixir-tools/next-ls/releases/latest/download/${exe}`;

    console.log(`Starting download from ${url}`);
    channel.info(`Starting download from ${url}`);

    await fetch(url).then((res) => {
      if (res.ok) {
        return new Promise((resolve, reject) => {
          const file = fs.createWriteStream(bin);
          res.body?.pipe(file);
          file.on("close", resolve);
          file.on("error", reject);
        })
          .then(() => channel.info("Downloaded NextLS!"))
          .catch(() => {
            console.log("Failed to write downloaded executable to a file");
            channel.error("Failed to write downloaded executable to a file");
          });
      } else {
        console.log(`Failed to write download Next LS: status=${res.status}`);
        channel.error(`Failed to write download Next LS: status=${res.status}`);
      }
    });
    await fsp.chmod(bin, "755");
  }

  return new Promise((resolve) => resolve(bin));
}

async function isBinaryMissing(bin: string) {
  try {
    await fsp.access(bin, fs.constants.X_OK);
    channel.info(`Found Next LS executable at ${bin}`);
    return false;
  } catch {
    channel.warn(`Did not find Next LS executable at ${bin}`);
    return true;
  }
}

function getExe(platform: string) {
  const arch = os.arch();

  switch (platform) {
    case "windows":
      switch (arch) {
        case "x64":
          return "next_ls_windows_amd64.exe";
      }
    case "darwin":
      switch (arch) {
        case "x64":
          return "next_ls_darwin_amd64";

        case "arm64":
          return "next_ls_darwin_arm64";
      }

    case "linux":
      switch (arch) {
        case "x64":
          return "next_ls_linux_amd64";

        case "arm64":
          return "next_ls_linux_amd64";
      }

    default:
      throw new Error(`Unsupported architecture: ${arch}`);
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
