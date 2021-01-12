import { CodeCellModel } from '@jupyterlab/cells';
import { Token } from '@lumino/coreutils';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  cellValue: string;
}

export class MyManager implements IMyManager {
  set cellValue(newValue: string) {
    this._cell.value.text = newValue;
  }
  get cellValue(): string {
    return this._cell.value.text;
  }

  set codeCell(cell: CodeCellModel) {
    this._cell = cell;
  }

  private _cell: CodeCellModel;
}