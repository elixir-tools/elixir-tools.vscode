# elixir-tools.vscode

The official [elixir-tools](https://github.com/elixir-tools) extension for VSCode!

elixir-tools.vscode provides support for:

* Filetype detection for .ex and .exs Elixir files
* Syntax highlight for Elixir
* Credo Language Server

## Install

Install from the extension [marketplace](https://marketplace.visualstudio.com/items?itemName=elixir-tools.elixir-tools).

### From Source

```bash
# package up the extension into a .vsix file
$ npx vsce package

# install the .vsix package
$ code --install-extension elixir-tools-0.0.4.vsix --force
```
