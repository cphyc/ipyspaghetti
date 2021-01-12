import {
  ISessionContext,
  SessionContext,
  sessionContextDialogs,
  Toolbar,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';
import {
  CompleterModel,
  Completer,
  CompletionHandler,
  KernelConnector
} from '@jupyterlab/completer';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ServiceManager } from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { Message } from '@lumino/messaging';

import { CommandRegistry } from '@lumino/commands';

import { BoxPanel, SplitPanel } from '@lumino/widgets';

import { GraphWidget } from './graph_widget';

/**
 * The class name added to the example panel.
 */
const PANEL_CLASS = 'jp-RovaPanel';

/**
 * A panel with the ability to add other children.
 */
export class ExamplePanel extends SplitPanel {
  constructor(
    manager: ServiceManager.IManager,
    rendermime: IRenderMimeRegistry,
    commands: CommandRegistry,
    translator?: ITranslator
  ) {
    super({
      orientation: 'vertical'
    });
    this._translator = translator || nullTranslator;
    this._trans = this._translator.load('jupyterlab');
    this.addClass(PANEL_CLASS);
    this.id = 'kernel-output-panel';
    this.title.label = this._trans.__('Kernel Output Example View');
    this.title.closable = true;

    const { sessions, kernelspecs } = manager;

    this._sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'Kernel Output'
    });

    /** ---------------------------------------------------------------
     * Create input code cell
     */
    const cellModel = new CodeCellModel({});
    const mimeService = new CodeMirrorMimeTypeService();
    this._cell = new CodeCell({
      model: cellModel,
      rendermime
    }).initializeState();

    this._cell.outputHidden = false;
    this._cell.outputsScrolled = true;

    // Handle the mimeType for the current kernel asynchronously.
    this._sessionContext.kernelChanged.connect(() => {
      void this._sessionContext.session?.kernel?.info.then(info => {
        const lang = info.language_info;
        const mimeType = mimeService.getMimeTypeByLanguage(lang);
        cellModel.mimeType = mimeType;
      });
    });

    // Set up a completer.
    const editor = this._cell.editor;
    const model = new CompleterModel();
    const completer = new Completer({ editor, model });
    const connector = new KernelConnector({
      session: this._sessionContext.session
    });
    const handler = new CompletionHandler({ completer, connector });

    editor.setOption('codeFolding', true);
    editor.setOption('lineNumbers', true);
    cellModel.value.text =
      "import yt\nds = yt.load('output_00080/info_00080.txt')\np = yt.SlicePlot(ds, 'x', 'density')";

    console.log(editor.model);

    // Set handler's editor.
    handler.editor = editor;

    // Hide the widget when it first loads.
    completer.hide();

    // Create a toolbar for the cell.
    const toolbar = new Toolbar();
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem(
      'interrupt',
      Toolbar.createInterruptButton(this._sessionContext)
    );
    toolbar.addItem(
      'restart',
      Toolbar.createRestartButton(this._sessionContext)
    );
    toolbar.addItem('name', Toolbar.createKernelNameItem(this._sessionContext));
    toolbar.addItem(
      'status',
      Toolbar.createKernelStatusItem(this._sessionContext)
    );

    // Graph widget
    const content = new GraphWidget();
    const widget = new MainAreaWidget<GraphWidget>({ content });
    widget.title.label = 'React Widget';
    widget.show();

    // Lay out the widgets
    const box = new BoxPanel({});
    BoxPanel.setStretch(toolbar, 0);
    BoxPanel.setStretch(this._cell, 1);
    [completer, toolbar, this._cell].forEach(w => box.addWidget(w));

    SplitPanel.setStretch(widget, 1);
    SplitPanel.setStretch(box, 1);
    // Lay out the widgets.
    this.addWidget(widget);
    this.addWidget(box);

    // Add the commands.
    commands.addCommand('invoke:completer', {
      execute: () => {
        handler.invoke();
      }
    });
    commands.addCommand('run:cell', {
      execute: () => {
        CodeCell.execute(this._cell, this._sessionContext);
      }
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
