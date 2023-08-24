# elixir-tools.vscode

[![Discord](https://img.shields.io/badge/Discord-5865F3?style=flat&logo=discord&logoColor=white&link=https://discord.gg/nNDMwTJ8)](https://discord.gg/6XdGnxVA2A)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/elixir-tools.elixir-tools?label=Visual%20Studio%20Marketplace%20Installs)](https://marketplace.visualstudio.com/items?itemName=elixir-tools.elixir-tools)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/elixir-tools/elixir-tools?label=Open%20VSX%20Downloads)](https://open-vsx.org/extension/elixir-tools/elixir-tools)
[![GitHub Discussions](https://img.shields.io/github/discussions/elixir-tools/discussions)](https://github.com/orgs/elixir-tools/discussions)

The official [elixir-tools](https://github.com/elixir-tools) extension for Visual Studio Code!

elixir-tools.vscode provides support for:

* Filetype detection for .ex and .exs Elixir files
* Syntax highlight for Elixir
* [Next LS](https://www.elixir-tools.dev/next-ls)
* [Credo Language Server](https://github.com/elixir-tools/credo-language-server) (disabled by default, as Next LS has support for Credo diagnostics)

## Install

Install from the extension [marketplace](https://marketplace.visualstudio.com/items?itemName=elixir-tools.elixir-tools).

### From Source

```bash
# package up the extension into a .vsix file
$ npx vsce package

# install the .vsix package
$ code --install-extension elixir-tools-X.X.X.vsix --force
```
