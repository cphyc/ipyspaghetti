import {
  SessionContext
} from '@jupyterlab/apputils';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { SplitPanel } from '@lumino/widgets';

import { IMyManager } from './manager';

import { GraphEditionPanel } from './graph_panel';

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
export class GraphWindow extends SplitPanel implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions, api: IMyPublicAPI) {
    super({
      ...options,
      orientation: 'vertical',
    });
    // this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);

    const { sessions } = api.manager.manager;
    const { kernelspecs } = api.manager.manager;

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'IPyGraph Kernel',
    });

    const widget = new GraphEditionPanel(
      sessionContext,
      api,
      {direction: 'top-to-bottom'}
    );
    widget.show();
    this.addWidget(widget);

    // TODO: initialize session with content
    // sessionContext
    //   .initialize()
    //   .then(async (value) => {
    //     if (value) {
    //       await sessionContextDialogs.selectKernel(sessionContext);
    //     }
    //     await execute(
    //       this._cell.model.value.text,
    //       this._output,
    //       this._sessionContext
    //     );
    //     await this.reloadNodes();
    //   })
    //   .catch((reason) => {
    //     console.error(
    //       `Failed to initialize the session in ExamplePanel.\n${reason}`
    //     );
    //   });
  }

  // private async reloadNodes(): Promise<void> {
  //   // TODO: less ugly!
  //   await execute(
  //     'print(registry.get_nodes_as_json())',
  //     this._output,
  //     this._sessionContext
  //   );
  //   const { graph } = this._graphWidget;
  //   graph.createComponents(this._output.graphData);
  //   graph.loadGraph(this._graphData);
  // }

  // private runGraph(): void {
  //   this._graphWidget.graph.graph.runStep();
  // }

  /**
   * Render ipygraph into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // const data = model.data[this._mimeType] as string;
    // const magicString = '___NODES = """';
    // const splitPoint = data.indexOf(magicString);
    // this._cell.model.value.text = data.substr(0, splitPoint);
    // const endPoint = data.lastIndexOf('"""');
    // this._graphData = data.substring(splitPoint + magicString.length, endPoint);
  }

  // private _mimeType: string;

  // private _cell: NodeCodeCell;

  // private _sessionContext: SessionContext;

  // private _output: OutputArea2;

  // private _graphWidget: GraphWidget;

  // private _graphData: string;
}

export interface IMyPublicAPI {
  manager: IMyManager;
}

/**
 * A public API to communicate with the graph mime handler
 */
export const MyPublicAPI: IMyPublicAPI = {
  manager: null,
};

/**
 * A mime renderer factory for ipygraph data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: (options) => new GraphWindow(options, MyPublicAPI),
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
      extensions: ['.ipyg'],
    },
  ],
  documentWidgetFactoryOptions: {
    name: 'IPython Graph Viewer',
    primaryFileType: 'ipygraph',
    fileTypes: ['ipygraph'],
    defaultFor: ['ipygraph'],
  },
};

export default extension;
