import {
  ISessionContext,
  SessionContext,
  sessionContextDialogs,
  Toolbar
} from '@jupyterlab/apputils';

import {
  CodeCell,
  CodeCellModel
} from '@jupyterlab/cells';

import {
  CompleterModel,
  Completer,
  CompletionHandler,
  KernelConnector
} from '@jupyterlab/completer';

import {
  IRenderMimeRegistry,
} from '@jupyterlab/rendermime';

import { ServiceManager } from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { Message } from '@lumino/messaging';

import { CommandRegistry } from '@lumino/commands';

import { BoxPanel } from '@lumino/widgets';

/**
 * The class name added to the example panel.
 */
const PANEL_CLASS = 'jp-RovaPanel';

/**
 * A panel with the ability to add other children.
 */
export class ExamplePanel extends BoxPanel {
  constructor(
    manager: ServiceManager.IManager,
    rendermime: IRenderMimeRegistry,
    commands: CommandRegistry,
    translator?: ITranslator,
  ) {
    super();
    this._translator = translator || nullTranslator;
    this._trans = this._translator.load('jupyterlab');
    this.addClass(PANEL_CLASS);
    this.id = 'kernel-output-panel';
    this.title.label = this._trans.__('Kernel Output Example View');
    this.title.closable = true;

    this._sessionContext = new SessionContext({
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      name: 'Kernel Output'
    });


    /** ---------------------------------------------------------------
     * Create input code cell
     */
    let _cellmodel = new CodeCellModel({});
    this._cell = new CodeCell({
      model: _cellmodel,
      rendermime
    }).initializeState();
    this._cell.outputHidden = false;

    // Set up a completer.
    const editor = this._cell.editor;
    const model = new CompleterModel();
    const completer = new Completer({ editor, model });
    const connector = new KernelConnector({ session: this._sessionContext.session });
    const handler = new CompletionHandler({ completer, connector });

    // Set the handler's editor.
    handler.editor = editor;

    // Hide the widget when it first loads.
    completer.hide();

    // Create a toolbar for the cell.
    const toolbar = new Toolbar();
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('interrupt', Toolbar.createInterruptButton(this._sessionContext));
    toolbar.addItem('restart', Toolbar.createRestartButton(this._sessionContext));
    toolbar.addItem('name', Toolbar.createKernelNameItem(this._sessionContext));
    toolbar.addItem('status', Toolbar.createKernelStatusItem(this._sessionContext));
    BoxPanel.setStretch(toolbar, 0);
    BoxPanel.setStretch(this._cell, 1);

    // Lay out the widgets.
    this.addWidget(completer);
    this.addWidget(toolbar);
    this.addWidget(this._cell);

    // Add the commands.
    commands.addCommand('invoke:completer', {
      execute: () => {
        handler.invoke();
      }
    });
    commands.addCommand('run:cell', {
      execute: () => CodeCell.execute(this._cell, this._sessionContext)
    });

    commands.addKeyBinding({
      selector: '.jp-InputArea-editor.jp-mod-completer-enabled',
      keys: ['Tab'],
      command: 'invoke:completer'
    });
    commands.addKeyBinding({
      selector: '.jp-InputArea-editor',
      keys: ['Shift Enter'],
      command: 'run:cell'
    });

    void this._sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          await sessionContextDialogs.selectKernel(this._sessionContext);
        }
      })
      .catch(reason => {
        console.error(
          `Failed to initialize the session in ExamplePanel.\n${reason}`
        );
      });
  }

  get session(): ISessionContext {
    return this._sessionContext;
  }

  dispose(): void {
    this._sessionContext.dispose();
    super.dispose();
  }

  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  private _sessionContext: SessionContext;

  private _cell: CodeCell;

  private _translator: ITranslator;
  private _trans: TranslationBundle;
}
