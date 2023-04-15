# elixir-tools.vscode

The official [elixir-tools](https://github.com/elixir-tools) extension for VSCode!

elixir-tools.vscode provides support for:

* Filetype detection for .ex and .exs Elixir files
* Syntax highlight for Elixir
* Credo Language Server

## Install

Currently you must install from source.

```bash
# package up the extension into a .vsix file
$ npx vsce package

# install the .vsix package
$ code --install-extension elixir-tools-0.0.1.vsix --force
```
