import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../../extension.js";
import * as sinon from "sinon";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  setup(function () {
    fs.rmSync("./test-bin", { recursive: true, force: true });
    sinon.stub(vscode.window, "showInformationMessage").returns(
      new Promise((resolve) => {
        return resolve({ title: "Yes" });
      })
    );
  });

  teardown(function () {
    sinon.restore();
  });

  test("downloads Next LS", async function () {
    fs.mkdirSync("./test-bin", { recursive: true });

    let result = await myExtension.ensureNextLSDownloaded("test-bin");
    assert.equal(path.normalize(result), path.normalize("test-bin/nextls"));
  });
});
