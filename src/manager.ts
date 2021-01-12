import { Token } from '@lumino/coreutils';

export const IMyManager = new Token<IMyManager>('node_manager:IMyManager');

export interface IMyManager {
  doTheThing(): Promise<void>;
}

export class MyManager implements IMyManager {
  async doTheThing(): Promise<void> {
    return;
  }
}