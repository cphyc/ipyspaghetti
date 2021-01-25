import {
  Toolbar,
  SessionContext,
  MainAreaWidget,
  sessionContextDialogs,
  ToolbarButton
} from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { BoxPanel, SplitPanel } from '@lumino/widgets';

import { IMyPublicAPI } from './mime';

import { GraphEditor } from './graph_widget';

import { GraphAPI } from './graph_api';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';

import { CodeCell } from '@jupyterlab/cells';

/** Inputs/outputs of functions */
export interface IFunctionSchemaIO {
  type: string;
  optional: boolean;
}

/** Schema of a function */
export interface IFunctionSchema {
  inputs: { [id: string]: IFunctionSchemaIO };
  outputs: { [id: string]: IFunctionSchemaIO };
  name: string;
  source: string;
}

/** Schema of a graph node cell */
export interface IGraphNodeSchema {
  id: number;
  function: IFunctionSchema;
}

const EDITOR_CLASS_NAME = 'mimerenderer-ipygraph-editor';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-ipygraph';
export class GraphEditionPanel extends MainAreaWidget<SplitPanel>
  implements IRenderMime.IRenderer {
  private _sessionContext: SessionContext;
  private _mimeRendererOptions: IRenderMime.IRendererOptions;
  private _graphAPI: GraphAPI;
  private _context: DocumentRegistry.Context;

  // private _mimeRendererOptions: IRenderMime.IRendererOptions;
  constructor(
    api: IMyPublicAPI,
    options?: GraphEditionPanel.IOptions,
    mimeRendererOptions?: IRenderMime.IRendererOptions
  ) {
    const { context, ...otherOptions } = options;
    const content = new SplitPanel(otherOptions);
    super({ content });

    this._context = context;
    const { sessions, kernelspecs } = api.manager.manager;

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'IPyGraph Kernel'
    });

    // this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);

    // Initialize the API
    const { rendermime } = api.manager;
    const graphAPI = new GraphAPI(sessionContext, rendermime);

    const graphEditor = new GraphEditor(graphAPI);
    const functionEditorBox = new BoxPanel({});
    const nodeViewerBox = new BoxPanel({});
    [functionEditorBox, nodeViewerBox].forEach(widget => {
      widget.addClass(EDITOR_CLASS_NAME);
    });

    // Attach the widget now that the kernel is ready
    graphAPI.setWidgets(graphEditor, functionEditorBox, nodeViewerBox);

    // Setup code box
    const codeBox = new SplitPanel({});
    SplitPanel.setStretch(functionEditorBox, 1);
    SplitPanel.setStretch(nodeViewerBox, 1);
    codeBox.addWidget(functionEditorBox);
    codeBox.addWidget(nodeViewerBox);

    // Setup content
    SplitPanel.setStretch(graphEditor, 1);
    SplitPanel.setStretch(codeBox, 1);
    content.addWidget(graphEditor);
    content.addWidget(codeBox);

    // Data from file has been red
    options.context?.ready.then(() => {
      this.loadData();
    });

    // Change the mime type of cells when the kernel has loaded
    const mimeService = new CodeMirrorMimeTypeService();
    sessionContext.kernelChanged.connect(() => {
      sessionContext.session?.kernel?.info.then(async info => {
        const lang = info.language_info;
        const mimeType = mimeService.getMimeTypeByLanguage(lang);
        for (const box of [nodeViewerBox, functionEditorBox]) {
          box.widgets.forEach(w => ((w as CodeCell).model.mimeType = mimeType));
        }
        // Execute globals cell...
        await graphAPI.executeGlobals();
        // Execute node code source...
        await graphAPI.executeNodeSource();
        // Gather list of loadable nodes...
        await graphAPI.loadFunctionList();
        // Gather type inheritance to match sockets...
        await graphAPI.loadTypeInheritance();
        // and finally setup the graph
        await graphAPI.setupGraph();
      });
    });

    this._sessionContext = sessionContext;
    this._mimeRendererOptions = mimeRendererOptions;
    this._graphAPI = graphAPI;

    // Query a kernel
    sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          await sessionContextDialogs.selectKernel(sessionContext);
        }
      })
      .catch(reason => {
        console.error(
          `Failed to initialize the session in ExamplePanel.\n${reason}`
        );
      });
    this._sessionContext;

    const runGraph = new ToolbarButton({
      className: 'jp-DebuggerBugButton',
      label: 'Run Graph',
      onClick: (): void => {
        graphEditor?.graphHandler?.graph?.runStep();
      }
    });
    this.toolbar.addItem('ipygraph:run-graph', runGraph);

    const save = new ToolbarButton({
      className: 'jp-DebuggerBugButton',
      label: 'Save',
      onClick: async (): Promise<void> => {
        return this.save();
      }
    });
    this.toolbar.addItem('ipygraph:save', save);

    populateGraphToolbar(this.toolbar, sessionContext);
  }

  protected save(): Promise<void> {
    const data = this._graphAPI.dataAsString();
    this._context.model.fromString(data);
    return this._context.save();
  }

  protected load(data: string): void {
    const { globals, nodes, graph } = GraphAPI.splitData(data);

    this._graphAPI.setupGlobals(globals);
    this._graphAPI.setupNodeSource(nodes);
    this._graphAPI.graphData = JSON.parse(graph);
  }

  /**
   * Render data when new widget is created.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const mimeType = this._mimeRendererOptions.mimeType;
    const data = model.data[mimeType] as string;
    this.load(data);
  }

  /**
   * Render data when loaded from disk.
   */
  protected loadData(): void {
    const data = this._context.model.toString();
    this.load(data);
  }
}

function populateGraphToolbar(
  toolbar: Toolbar,
  sessionContext: SessionContext
): void {
  toolbar.addItem('spacer', Toolbar.createSpacerItem());
  toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
  toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
  toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
  toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));
}

export namespace GraphEditionPanel {
  /**
   * Instantiation options for CSV widgets.
   */
  export interface IOptions extends SplitPanel.IOptions {
    /**
     * The document context for the CSV being rendered by the widget.
     */
    context?: DocumentRegistry.Context;
  }
}
