import {
  MainAreaWidget,
  SessionContext,
  Toolbar,
  ToolbarButton,
  sessionContextDialogs
} from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';
import { OutputArea } from '@jupyterlab/outputarea';

// import { KernelConnector } from '@jupyterlab/completer';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { SplitPanel } from '@lumino/widgets';

import { GraphWidget } from './graph_widget';

import { IMyManager } from './manager';

import { execute, cloneOutput, OutputArea2 } from './utils';

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

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'IPyGraph Kernel'
    });

    this._sessionContext = sessionContext;

    const cellModel = new CodeCellModel({});
    const mimeService = new CodeMirrorMimeTypeService();
    const cell = new CodeCell({
      model: cellModel,
      rendermime
    }).initializeState();
    cell.outputHidden = false;
    cell.outputsScrolled = true;
    cell.outputArea.show();

    this._output = cloneOutput(cell, rendermime);
    this._output.show();

    sessionContext.kernelChanged.connect(() => {
      void sessionContext.session?.kernel?.info.then(info => {
        const lang = info.language_info;
        const mimeType = mimeService.getMimeTypeByLanguage(lang);
        cellModel.mimeType = mimeType;
      });


      // // TODO: doesn't work
      // const completionManager = api.manager.completionManager;
      // const connector = new KernelConnector({
      //   session: sessionContext.session
      // });

      // completionManager.register({
      //   connector,
      //   editor: cell.editor,
      //   parent: this
      // });
    });

    const editor = cell.editor;

    editor.setOption('codeFolding', true);
    editor.setOption('lineNumbers', true);

    // Create a toolbar for the cell.
    const reloadNodes = new ToolbarButton({
      className: 'jp-DebuggerBugButton',
      label: 'Reload nodes',
      onClick: this.reloadNodes.bind(this)
    });
    const runGraph = new ToolbarButton({
      className: 'jp-DebuggerBugButton',
      label: 'Run Graph',
      onClick: this.runGraph.bind(this)
    });
    const toolbar = new Toolbar();
    toolbar.addItem('reload-nodes', reloadNodes);
    toolbar.addItem('run-graph', runGraph);
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
    toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
    toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
    toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));

    // Graph widget
    const content = new GraphWidget((id: number, props: any) => {
      // Build args
      const args = props.parameters
      .map((param: any) => {
        const val = param.data;

        if (param.data === null) {
          return `${param.name}=__out_${param.node_id}`;
        } else {
          switch (typeof val) {
              case 'number':
                return `${param.name}=${param.data}`;
              case 'boolean':
                return `${param.name}=${param.data ? 'True' : 'False'}`;
              case 'string':
              default:
                return `${param.name}="${param.data}"`;
          }
        }
      })
      .join(', ');
      // Build code
      const code = `__out_${id} = registry.nodes["${props.info.name}"](${args})\n__out_${id}`;
      console.debug(`Executing ${code}`);
      cell.model.value.text = code;

      return OutputArea.execute(code, cell.outputArea, this._sessionContext);
    });
    const graphWidget = new MainAreaWidget<GraphWidget>({ content });
    content.show();
    graphWidget.show();

    this._graphWidget = content;

    // Lay out the widgets
    cell.addClass(EDITOR_CLASS_NAME);

    SplitPanel.setStretch(graphWidget, 1);
    SplitPanel.setStretch(cell, 1);
    this.addWidget(toolbar);
    this.addWidget(graphWidget);
    this.addWidget(cell);
    this.addWidget(this._output);

    // Wire code editor
    this._cell = cell;

    void sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          await sessionContextDialogs.selectKernel(sessionContext);
        }
        await execute(
          this._cell.model.value.text,
          this._output,
          this._sessionContext
        );
        await this.reloadNodes();
      })
      .catch(reason => {
        console.error(
          `Failed to initialize the session in ExamplePanel.\n${reason}`
        );
      });
  }

  private async reloadNodes(): Promise<void> {
    // TODO: less ugly!
    await execute(
      'print(registry.get_nodes_as_json())',
      this._output,
      this._sessionContext
    );
    const graph = this._graphWidget.graph;
    graph.createComponents(this._output.graphData);
    graph.loadGraph(this._graphData);
  }

  private runGraph(): void {
    this._graphWidget.graph.graph.runStep();
  }

  /**
   * Render ipygraph into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    const magicString = '___NODES = """';
    const splitPoint = data.indexOf(magicString);
    const endPoint = data.lastIndexOf('"""');
    this._cell.model.value.text = data.substr(0, splitPoint);
    this._graphData = data.substring(splitPoint + magicString.length, endPoint);
    return;
  }

  private _mimeType: string;

  private _cell: CodeCell;

  private _sessionContext: SessionContext;

  private _output: OutputArea2;

  private _graphWidget: GraphWidget;

  private _graphData: string;
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
