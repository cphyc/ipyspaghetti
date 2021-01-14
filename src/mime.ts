import { MainAreaWidget, SessionContext, Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';

import { KernelConnector } from '@jupyterlab/completer';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { SplitPanel } from '@lumino/widgets';

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
const EDITOR_CLASS_NAME = 'mimerenderer-ipygraph-editor';

/**
 * A widget for rendering ipygraph.
 */
export class GraphWindow extends SplitPanel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions, api: IMyPublicAPI) {
    super({
      ...options,
      orientation: 'vertical'
    });
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);

    const rendermime = api.manager.rendermime;
    const sessions = api.manager.manager.sessions;
    const kernelspecs = api.manager.manager.kernelspecs;
    const completionManager = api.manager.completionManager;

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

      const connector = new KernelConnector({
        session: sessionContext.session
      });

      const ret = completionManager.register({
        connector,
        editor: cell.editor,
        parent: this
      });
      console.log(ret);
    });

    const editor = cell.editor;

    editor.setOption('codeFolding', true);
    editor.setOption('lineNumbers', true);

    // Create a toolbar for the cell.
    const icon = new ToolbarButton({
      className: 'jp-DebuggerBugButton',
      label: 'Click me!',
      onClick: (): void => {
        cell.outputArea.
      }
    });
    const toolbar = new Toolbar();
    toolbar.addItem('clickme', icon);
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
    toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
    toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
    toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));

    // Graph widget
    const content = new GraphWidget();
    const graphWidget = new MainAreaWidget<GraphWidget>({ content });
    graphWidget.show();

    // Lay out the widgets
    cell.addClass(EDITOR_CLASS_NAME);

    SplitPanel.setStretch(graphWidget, 1);
    SplitPanel.setStretch(cell, 1);
    this.addWidget(toolbar);
    this.addWidget(graphWidget);
    this.addWidget(cell);

    // Wire code editor
    this._cell = cell;
  }

  /**
   * Render ipygraph into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    this._cell.model.value.text = data.substr(
      0,
      data.indexOf('___NODES = """')
    );
    // this._api.manager.execute(this.node.textContent);
    // this._api.manager.cellValue = 'registry';
    // return Promise.resolve();
    return;
  }

  private _mimeType: string;

  private _cell: CodeCell;
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
  createRenderer: options => new GraphWindow(options, MyPublicAPI)
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
