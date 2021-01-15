# IpySpaghetti

![Github Actions Status](https://github.com/cphyc/node_editor/workflows/Build/badge.svg)[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/cphyc/node_editor/main?urlpath=lab)

A JupyterLab extension.

This extension is composed of a Python package named `node_editor`
for the server extension and a NPM package named `node_editor`
for the frontend extension.

*This a WIP*

This project is an attempt to provide an interactive environment reusing many ideas from the jupiter project, except the interaction is based on the idea of nodes and dataflow rather than code cells.

Each "node" is a function with some inputs and outputs. A script is a graph made of these nodes, where each nodes' output may be connected to an arbitrary number of other inputs.

## Features & TODO list

- [x] Provide a basic interface to create the graph
- [x] Load the nodes from Python
- [x] Basic interface with ipykernel
- [x] Basic output back in the browser
- [x] Lazy execution of the nodes (only the new ones are executed, or those downstream)
- [x] Basic save/restore graph
- [x] Integrate in JupyterLab
- [x] Support `ipyg` mimetype
- [x] Edit the nodes' code in the browser _à la_ Jupyter Notebook
- [x] (partially done) Rename to IPySphaghetti
- [ ] Nice packaging

## Requirements

* JupyterLab >= 3.0

## Install

```bash
pip install node_editor
```


## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```


## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the node_editor directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Uninstall

```bash
pip uninstall node_editor
```
