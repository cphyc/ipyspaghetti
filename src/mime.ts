import { MainAreaWidget, SessionContext, Toolbar } from '@jupyterlab/apputils';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';
import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';
import {
  Completer,
  CompleterModel,
  CompletionHandler,
  KernelConnector
} from '@jupyterlab/completer';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { BoxPanel, SplitPanel } from '@lumino/widgets';
import { GraphWidget } from './graph_widget';

import { IMyManager } from './manager';

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/vnd.ipython.graph+json';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-ipygraph';

/**
 * A widget for rendering ipygraph.
 */
export class OutputWidget extends SplitPanel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions, api: IMyPublicAPI) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
    this._api = api;

    const rendermime = api.manager.rendermime;
    const sessions = api.manager.manager.sessions;
    const kernelspecs = api.manager.manager.kernelspecs;

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'Kernel Output'
    });

    const cellModel = new CodeCellModel({});
    const mimeService = new CodeMirrorMimeTypeService();
    const cell = new CodeCell({
      model: cellModel,
      rendermime
    }).initializeState();
    cell.outputHidden = false;
    cell.outputsScrolled = true;

    sessionContext.kernelChanged.connect(() => {
      void sessionContext.session?.kernel?.info.then(info => {
        const lang = info.language_info;
        const mimeType = mimeService.getMimeTypeByLanguage(lang);
        cellModel.mimeType = mimeType;
      });
    });

    const editor = cell.editor;
    const model = new CompleterModel();
    const completer = new Completer({ editor, model });
    const connector = new KernelConnector({
      session: sessionContext.session
    });
    const handler = new CompletionHandler({ completer, connector });

    editor.setOption('codeFolding', true);
    editor.setOption('lineNumbers', true);
    cellModel.value.text = `import yt
ds = yt.load('output_00080/info_00080.txt')
p = yt.SlicePlot(ds, 'x', 'density')
p`;

    // Set handler's editor.
    handler.editor = editor;

    // Hide the widget when it first loads.
    completer.hide();

    // Create a toolbar for the cell.
    const toolbar = new Toolbar();
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
    toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
    toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
    toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));

    // Graph widget
    const content = new GraphWidget();
    const widget = new MainAreaWidget<GraphWidget>({ content });
    widget.title.label = 'React Widget';
    widget.show();

    // Lay out the widgets
    const box = new BoxPanel({});
    BoxPanel.setStretch(toolbar, 0);
    BoxPanel.setStretch(cell, 1);
    [completer, toolbar, cell].forEach(w => box.addWidget(w));

    SplitPanel.setStretch(widget, 1);
    SplitPanel.setStretch(box, 1);
    // Lay out the widgets.
    this.addWidget(widget);
    this.addWidget(box);
  }

  /**
   * Render ipygraph into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    this.node.textContent = data.substr(0, data.indexOf('___NODES = """'));
    console.log(this._api.manager.cellValue);
    this._api.manager.execute(this.node.textContent);
    this._api.manager.cellValue = 'registry';
    // return Promise.resolve();
    return;
  }

  private _mimeType: string;
  private _api: IMyPublicAPI;
}

export interface IMyPublicAPI {
  manager: IMyManager;
}

/**
 * A public API to communicate with the graph mime handler
 */
export const MyPublicAPI: IMyPublicAPI = {
  manager: null
};

/**
 * A mime renderer factory for ipygraph data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new OutputWidget(options, MyPublicAPI)
};

/**
 * Extension definition.
 */
const extension: IRenderMime.IExtension = {
  id: '@node_editor/mime:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'string',
  fileTypes: [
    {
      name: 'ipygraph',
      mimeTypes: [MIME_TYPE],
      extensions: ['.ipyg']
    }
  ],
  documentWidgetFactoryOptions: {
    name: 'IPython Graph Viewer',
    primaryFileType: 'ipygraph',
    fileTypes: ['ipygraph'],
    defaultFor: ['ipygraph']
  }
};

export default extension;
