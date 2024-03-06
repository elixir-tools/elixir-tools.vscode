import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../../extension.js";
import * as uninstall from "../../commands/uninstall.js";
import * as sinon from "sinon";

let binName: string;

if (os.platform() === "win32") {
  binName = "nextls.exe";
} else {
  binName = "nextls";
}

// TODO: should extract the tests to the directory of the file under test
suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");
  let showInformationMessage;

  setup(function () {
    fs.rmSync("./test-bin", { recursive: true, force: true });
    showInformationMessage = sinon.stub(
      vscode.window,
      "showInformationMessage"
    );
  });

  teardown(function () {
    sinon.restore();
  });

  // TODO: should probably mock out the api calls to github
  test("downloads Next LS", async function () {
    fs.mkdirSync("./test-bin", { recursive: true });

    let result = await myExtension.ensureNextLSDownloaded("test-bin");
    assert.equal(path.normalize(result), path.normalize(`test-bin/${binName}`));
  });

  test("uninstalls Next LS", async function () {
    fs.mkdirSync("./test-bin", { recursive: true });
    fs.writeFileSync(`./test-bin/${binName}`, "hello word");

    await uninstall.run("./test-bin");

    assert.equal(
      showInformationMessage.getCall(0).args[0],
      `Uninstalled Next LS from ${path.normalize(`test-bin/${binName}`)}`
    );
  });

  test("fails to uninstalls Next LS", async function () {
    let showErrorMessage = sinon.stub(vscode.window, "showErrorMessage");
    await uninstall.run("./test-bin");

    assert.match(
      showErrorMessage.getCall(0).args[0],
      /Failed to uninstall Next LS from/
    );
    assert.match(
      showErrorMessage.getCall(0).args[0],
      /due to Error: ENOENT: no such file or directory, lstat/
    );
  });

  if (os.platform() !== "win32") {
    // TODO: make a test for the opposite case. As of right now, I'm not entirely
    // sure how to set globalState inside a test before the extension activates.
    test("forces a download if the special key is not set", async function () {
      let fixpath = path.join(__dirname, "../../../src/test/fixtures/basic");
      let binpath = path.join(fixpath, "test-bin");
      fs.mkdirSync(path.normalize(binpath), { recursive: true });
      fs.writeFileSync(
        path.normalize(path.join(binpath, binName)),
        "hello world"
      );
      let ext = vscode.extensions.getExtension("elixir-tools.elixir-tools");

      await ext.activate();

      const doc = await vscode.workspace.openTextDocument(
        path.join(fixpath, "mix.exs")
      );
      await vscode.window.showTextDocument(doc);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let nextls = fs.readFileSync(path.normalize(path.join(binpath, binName)));
      assert.notEqual("hello world", nextls);
    }).timeout(5000);
  }
});
