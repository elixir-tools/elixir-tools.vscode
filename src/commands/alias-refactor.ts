import * as vscode from "vscode";

import {
  LanguageClient,
  ExecuteCommandRequest,
} from "vscode-languageclient/node";

export const run = async (client: LanguageClient) => {
  const position = vscode.window.activeTextEditor?.selection.start;

  client.sendRequest(ExecuteCommandRequest.type, {
    command: "alias-refactor",
    arguments: [
      {
        uri: vscode.window.activeTextEditor?.document.uri.toString(),
        position: position,
      },
    ],
  });
};

function registerAliasRefactorCommand(
  client: LanguageClient,
  context: vscode.ExtensionContext
) {
  const aliasRefactorCommand = "elixir-tools.aliasRefactor";
  const aliasRefactor = async () => run(client);
  context.subscriptions.push(
    vscode.commands.registerCommand(aliasRefactorCommand, aliasRefactor)
  );
}

export default registerAliasRefactorCommand;
