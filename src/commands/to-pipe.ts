import * as vscode from "vscode";

import {
  LanguageClient,
  ExecuteCommandRequest,
} from "vscode-languageclient/node";

export const run = async (client: LanguageClient) => {
  const position = vscode.window.activeTextEditor?.selection.start;

  client.sendRequest(ExecuteCommandRequest.type, {
    command: "to-pipe",
    arguments: [
      {
        uri: vscode.window.activeTextEditor?.document.uri.toString(),
        position: position,
      },
    ],
  });
};

function registerToPipeCommand(
  client: LanguageClient,
  context: vscode.ExtensionContext
) {
  const toPipeCommand = "elixir-tools.toPipe";
  const toPipe = async () => run(client);
  context.subscriptions.push(
    vscode.commands.registerCommand(toPipeCommand, toPipe)
  );
}

export default registerToPipeCommand;
