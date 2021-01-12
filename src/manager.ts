import { CodeCellModel } from '@jupyterlab/cells';

import { Token } from '@lumino/coreutils';

import { GraphWindow } from './panel';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  cellValue: string;
  graphWindow: GraphWindow;
  execute(code: string): void;
}

export class MyManager implements IMyManager {
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

  private _cell: CodeCellModel;
  private _panel: GraphWindow;
}