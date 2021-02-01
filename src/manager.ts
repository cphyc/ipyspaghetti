import { SessionContext } from '@jupyterlab/apputils';

import { ICompletionManager } from '@jupyterlab/completer';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ServiceManager } from '@jupyterlab/services';

import { Token } from '@lumino/coreutils';

import { NodeViewer, FunctionEditor } from './graph_api';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  manager: ServiceManager.IManager;
  rendermime: IRenderMimeRegistry;
  completionManager: ICompletionManager;

  currentFunction: FunctionEditor;
  currentNode: NodeViewer;
  currentContext: SessionContext;
}

export class MyManager implements IMyManager {
  private _currentNode: NodeViewer;
  private _currentFunction: FunctionEditor;
  currentContext: SessionContext;

  constructor(
    manager: ServiceManager.IManager,
    rendermime: IRenderMimeRegistry,
    completionManager: ICompletionManager
  ) {
    this._manager = manager;
    this._rendermime = rendermime;
    this._completionManager = completionManager;
  }

  get manager(): ServiceManager.IManager {
    return this._manager;
  }

  get rendermime(): IRenderMimeRegistry {
    return this._rendermime;
  }

  get completionManager(): ICompletionManager {
    return this._completionManager;
  }

  set currentFunction(fun: FunctionEditor) {
    this._currentFunction = fun;
  }

  get currentFunction(): FunctionEditor {
    return this._currentFunction;
  }

  set currentNode(node: NodeViewer) {
    this._currentNode = node;
  }

  get currentNode(): NodeViewer {
    return this._currentNode;
  }

  private _manager: ServiceManager.IManager;

  private _rendermime: IRenderMimeRegistry;

  private _completionManager: ICompletionManager;
}
