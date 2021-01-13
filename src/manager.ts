import { CodeCellModel } from '@jupyterlab/cells';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';

import { Token } from '@lumino/coreutils';

import { GraphWindow } from './panel';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  cellValue: string;
  graphWindow: GraphWindow;
  manager: ServiceManager.IManager;
  rendermime: IRenderMimeRegistry;
  execute(code: string): void;
}

export class MyManager implements IMyManager {
  constructor(
    manager: ServiceManager.IManager,
    rendermime: IRenderMimeRegistry
  ) {
    this._manager = manager;
    this._rendermime = rendermime;
  }
  set cellValue(newValue: string) {
    this._cell.value.text = newValue;
  }
  get cellValue(): string {
    return this._cell.value.text;
  }

  set graphWindow(w: GraphWindow) {
    this._panel = w;
  }

  set codeCell(cell: CodeCellModel) {
    this._cell = cell;
  }

  execute(code: string): void {
    this._panel.execute(code);
  }

  get manager(): ServiceManager.IManager {
    return this._manager;
  }

  get rendermime(): IRenderMimeRegistry {
    return this._rendermime;
  }

  private _cell: CodeCellModel;
  private _panel: GraphWindow;
  private _manager: ServiceManager.IManager;
  private _rendermime: IRenderMimeRegistry;
}