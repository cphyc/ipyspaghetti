import { ICompletionManager } from '@jupyterlab/completer';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';

import { Token } from '@lumino/coreutils';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  manager: ServiceManager.IManager;
  rendermime: IRenderMimeRegistry;
  completionManager: ICompletionManager;
}

export class MyManager implements IMyManager {
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

  private _manager: ServiceManager.IManager;
  private _rendermime: IRenderMimeRegistry;
  private _completionManager: ICompletionManager;
}