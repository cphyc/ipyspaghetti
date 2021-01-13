import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';

import { Token } from '@lumino/coreutils';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  manager: ServiceManager.IManager;
  rendermime: IRenderMimeRegistry;
}

export class MyManager implements IMyManager {
  constructor(
    manager: ServiceManager.IManager,
    rendermime: IRenderMimeRegistry
  ) {
    this._manager = manager;
    this._rendermime = rendermime;
  }

  get manager(): ServiceManager.IManager {
    return this._manager;
  }

  get rendermime(): IRenderMimeRegistry {
    return this._rendermime;
  }

  private _manager: ServiceManager.IManager;
  private _rendermime: IRenderMimeRegistry;
}