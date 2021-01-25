import { SessionContext } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IExecuteReplyMsg } from '@jupyterlab/services/lib/kernel/messages';

import { JSONObject } from '@lumino/coreutils';

import { Panel } from '@lumino/widgets';

import { GraphEditor } from './graph_widget';

import { OutputAreaInteractRegistry } from './utils';

import { nodeFactory } from './graph';

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
export interface INodeSchemaIO {
  type: 'node' | 'value';
  input: INodeSchema | any;
  optional: boolean;
}
export interface INodeSchema {
  id: number;
  function: IFunctionSchema;
  inputs: { [paramName: string]: INodeSchemaIO };
}

export const GLOBAL_NAMESPACE_FUNCTION_NAME = 'Global namespace';

export const NODE_VIEWER_CLASS = 'jp-node-viewer';

export const FUNCTION_EDITOR_CLASS = 'jp-function-editor';

// TODO: automatically infer this
const DEFAULT_MIME_TYPE = 'text/x-ipython';

export class GraphAPI {
  private _graphWidget: GraphEditor;
  private _funContainer: Panel;
  private _nodeContainer: Panel;

  private _rendermime: IRenderMimeRegistry;
  private _sessionContext: SessionContext;

  private _globalCodeCell: FunctionEditor;
  private _nodeCodeCell: FunctionEditor;
  private _registryOutput: OutputAreaInteractRegistry;
  private _graphData: object;
  private _typeInheritance: { [from: string]: string };

  constructor(sessionContext: SessionContext, rendermime: IRenderMimeRegistry) {
    this._sessionContext = sessionContext;
    this._rendermime = rendermime;
  }

  setWidgets(
    graphWidget: GraphEditor,
    funContainer: Panel,
    nodeContainer: Panel
  ): void {
    this._graphWidget = graphWidget;
    this._funContainer = funContainer;
    this._nodeContainer = nodeContainer;
    const functionEditorFactory = (): FunctionEditor => {
      const model = new CodeCellModel({});
      return new FunctionEditor(
        {
          inputs: {},
          outputs: {},
          name: GLOBAL_NAMESPACE_FUNCTION_NAME,
          source: ''
        },
        {
          model,
          rendermime: this._rendermime
        }
      );
    };
    this._globalCodeCell = functionEditorFactory();
    this._funContainer.addWidget(this._globalCodeCell);
    this._globalCodeCell.show();

    // To evaluate the nodes
    this._nodeCodeCell = functionEditorFactory();

    this._registryOutput = new OutputAreaInteractRegistry({
      model: new OutputAreaModel({}),
      rendermime: this._rendermime
    });
  }

  /**--------------------------------------------------------
   * Handle interactions with registry
   */
  async loadFunctionList(): Promise<void> {
    // TODO: less ugly solution!
    await OutputArea.execute(
      'from node_editor.graph import registry; print(registry.get_nodes_as_json())',
      this._registryOutput,
      this._sessionContext
    );
    const nodeSchemas = JSON.parse(this._registryOutput.IOPubStream);

    // Now we extract the node schemas
    Object.values(nodeSchemas).forEach(schemaRaw => {
      const schema = schemaRaw as IFunctionSchema;
      this.createFunction(schema);
      this._graphWidget.graphHandler.createFunction(schema);
    });
  }

  async loadTypeInheritance(): Promise<void> {
    // TODO: less ugly solution!
    await OutputArea.execute(
      'from node_editor.graph import registry; print(registry.get_parent_types_as_json())',
      this._registryOutput,
      this._sessionContext
    );
    this._typeInheritance = JSON.parse(this._registryOutput.IOPubStream);
  }

  getParentType(baseType: string): string {
    if (baseType in this._typeInheritance) {
      return this._typeInheritance[baseType];
    } else {
      return baseType;
    }
  }

  /**--------------------------------------------------------
   * Handle the single global cell
   */
  /** Set the value of the global imports */
  setupGlobals(source: string): void {
    if (!this._globalCodeCell) {
      console.error('Missing global code cell');
      return;
    }
    console.debug('Setting global code value');
    this._globalCodeCell.model.value.text = source;
  }

  /** Execute global imports */
  async executeGlobals(): Promise<void | IExecuteReplyMsg> {
    if (!this._globalCodeCell) {
      console.error('Missing global code cell');
      return;
    }
    console.debug('Executing global code value');
    return this._globalCodeCell.execute(this._sessionContext);
  }

  setupNodeSource(source: string): void {
    if (!this._nodeCodeCell) {
      console.error('Missing global node cell');
      return;
    }
    console.debug('Setting global node value');
    this._nodeCodeCell.model.value.text = source;
  }

  /** Execute initial node source */
  async executeNodeSource(): Promise<void | IExecuteReplyMsg> {
    if (!this._nodeCodeCell) {
      console.error('Missing global node cell');
      return;
    }
    console.debug('Executing global code value');
    return this._nodeCodeCell.execute(this._sessionContext);
  }

  set graphData(graphData: object) {
    this._graphData = graphData;
  }

  get graphData(): object {
    if (!this._graphData) {
      return {};
    } else {
      return this._graphData;
    }
  }

  // TODO: should call this every time the graph changes. Use signal?
  updateGraphData(): object {
    this._graphData = this._graphWidget.graphHandler.graph.serialize();
    return this.graphData;
  }

  dataAsString(): string {
    const globals = this._globalCodeCell.model.value.text;

    const nodes = this._funContainer.widgets
      .filter(w => {
        const w2 = w as FunctionEditor;
        return w2.schema.name !== GLOBAL_NAMESPACE_FUNCTION_NAME;
      })
      .map(w => {
        const w2 = w as FunctionEditor;
        return w2.model.value.text;
      })
      .join('\n');

    // TODO: this should be done automatically whenever the graph changes; leaving this for now.
    const graphData = this.updateGraphData();
    const graph = JSON.stringify(graphData, null, 2);

    const data = GraphAPI.buildData({ globals, nodes, graph });

    return data;
  }

  /** Set up the graph */
  setupGraph(): boolean | undefined {
    return this._graphWidget.graphHandler.graph.configure(this.graphData);
  }

  /**--------------------------------------------------------
   * Handle functions
   */
  createFunction(schema: IFunctionSchema): void {
    // Create the editor zone
    const model = new CodeCellModel({});
    model.mimeType = DEFAULT_MIME_TYPE;
    model.value.text = schema.source;
    const editor = new FunctionEditor(schema, {
      model,
      rendermime: this._rendermime
    }).initializeState();
    editor.hide();
    this._funContainer.addWidget(editor);

    // TODO: Add the function to the graph
    nodeFactory;
    this._graphWidget.graphHandler.loadComponents;
  }

  updateFunction(schema: IFunctionSchema): void {
    // Update the widget schema
    this._funContainer.widgets.forEach(w => {
      const w2 = w as FunctionEditor;
      if (w2.schema.name === schema.name) {
        w2.model.value.text = schema.source;
      }
    });

    // TODO: Update the function in the graph
  }

  removeFunction(schema: IFunctionSchema): void {
    this._funContainer.widgets.forEach(w => {
      const w2 = w as FunctionEditor;
      if (w2.schema.name === schema.name) {
        w.dispose();
      }
    });

    // TODO: remove function from the graph
  }

  executeFunction(schema: IFunctionSchema): Promise<void | IExecuteReplyMsg> {
    const tmp = this._funContainer.widgets.filter(w => {
      const w2 = w as FunctionEditor;
      return w2.schema.name === schema.name;
    });

    if (tmp.length !== 1) {
      throw `Expected 1 widget, got ${tmp.length}.`;
    }
    const widget = tmp[0] as FunctionEditor;
    return widget.execute(this._sessionContext);
    // TODO: mark function as correctly executed (or not)
  }

  selectFunction(schema: IFunctionSchema): void {
    // Reveal the function editor widget
    this._funContainer.widgets.forEach(w => {
      const w2 = w as FunctionEditor;
      if (w2.schema.name === schema.name) {
        w.show();
      } else {
        w.hide();
      }
    });
  }

  deselectFunction(): void {
    this._funContainer.widgets.forEach(w => {
      const w2 = w as FunctionEditor;
      if (w2.schema.name === GLOBAL_NAMESPACE_FUNCTION_NAME) {
        w.show();
      } else {
        w.hide();
      }
    });
  }

  /**--------------------------------------------------------
   * Handle nodes
   */
  createNode(schema: INodeSchema): void {
    // Create the editor zone
    const model = new CodeCellModel({});
    model.mimeType = DEFAULT_MIME_TYPE;
    model.value.text = NodeViewer.createCode(schema);
    const viewer = new NodeViewer(schema, {
      model,
      rendermime: this._rendermime
    }).initializeState();
    viewer.hide();
    this._nodeContainer.addWidget(viewer);

    // TODO: Add the function to the graph
  }

  updateNode(schema: INodeSchema): void {
    // Update the widget schema
    this._nodeContainer.widgets.forEach(w => {
      const w2 = w as NodeViewer;
      if (w2.schema.id === schema.id) {
        w2.model.value.text = NodeViewer.createCode(schema);
      }
    });

    // TODO: Update the cell in the graph
  }

  removeNode(schema: INodeSchema): void {
    this._nodeContainer.widgets.forEach(w => {
      const w2 = w as NodeViewer;
      if (w2.schema.id === schema.id) {
        w.dispose();
      }
    });
  }

  executeNode(schema: INodeSchema): Promise<void | IExecuteReplyMsg> {
    const tmp = this._nodeContainer.widgets.filter(w => {
      const w2 = w as NodeViewer;
      return w2.schema.id === schema.id;
    });

    if (tmp.length !== 1) {
      throw `Expected 1 widget, got ${tmp.length}.`;
    }
    const widget = tmp[0] as NodeViewer;
    return widget.execute(this._sessionContext);

    // TODO: mark cell as correctly executed
  }

  selectNode(schema: INodeSchema): void {
    // this._selectedNode = schema.id;
    // Reveal the function editor widget
    this._nodeContainer.widgets.forEach(w => {
      const w2 = w as NodeViewer;
      if (w2.schema.id === schema.id) {
        w.show();
      } else {
        w.hide();
      }
    });
    // TODO: inform the graph we've selected a cell
  }

  deselectNode(): void {
    this._nodeContainer.widgets.forEach(w => w.hide());
  }
}

export namespace GraphAPI {
  export const GLOBALS_MAGIC = '# % IPYS: Globals';
  export const NODES_MAGIC = '# % IPYS: Nodes';
  export const GRAPH_MAGIC = '# % IPYS: Graph';
  export const GRAPH_VARIABLE = '___GRAPH';

  export interface IGraphDataSchema {
    globals: string;
    nodes: string;
    graph: string;
  }

  export function splitData(data: string): IGraphDataSchema {
    const globalsStart = data.indexOf(GLOBALS_MAGIC) + GLOBALS_MAGIC.length + 1;
    const globalsEnd = data.indexOf(NODES_MAGIC);
    const nodesStart = globalsEnd + NODES_MAGIC.length + 1;
    const nodesEnd = data.indexOf(GRAPH_MAGIC);

    const magic = `${GRAPH_VARIABLE} = """`;
    const graphStart = data.indexOf(magic, nodesEnd) + magic.length;
    const graphEnd = data.lastIndexOf('"""');
    const graph = data.substring(graphStart, graphEnd);

    return {
      globals: data.substring(globalsStart, globalsEnd),
      nodes: data.substring(nodesStart, nodesEnd),
      graph: graph
    };
  }

  export function buildData(data: IGraphDataSchema): string {
    const graph = `${GRAPH_VARIABLE} = """${data.graph}"""`;
    return (
      `${GraphAPI.GLOBALS_MAGIC}\n${data.globals.trim()}\n\n\n` +
      `${GraphAPI.NODES_MAGIC}\n${data.nodes.trim()}\n\n\n` +
      `${GraphAPI.GRAPH_MAGIC}\n${graph}\n`
    );
  }
}

abstract class GenericCodeCell<T> extends CodeCell {
  private _schema: T;

  constructor(schema: T, options: CodeCell.IOptions) {
    super(options);
    this._schema = schema;

    const { editor } = this;
    editor.setOption('codeFolding', true);
    editor.setOption('lineNumbers', true);
  }

  execute(
    sessionContext: SessionContext,
    metadata?: JSONObject
  ): Promise<void | IExecuteReplyMsg> {
    return CodeCell.execute(this, sessionContext, metadata);
  }

  get schema(): T {
    return this._schema;
  }
}

/** Edit a function */
class FunctionEditor extends GenericCodeCell<IFunctionSchema> {
  constructor(schema: IFunctionSchema, options: CodeCell.IOptions) {
    super(schema, options);
    this.addClass(FUNCTION_EDITOR_CLASS);
  }
}

/** Show a node */
class NodeViewer extends GenericCodeCell<INodeSchema> {
  constructor(schema: INodeSchema, options: CodeCell.IOptions) {
    super(schema, options);
    this.addClass(NODE_VIEWER_CLASS);
    this.readOnly = true;
  }
}

namespace NodeViewer {
  export function createCode(schema: INodeSchema): string {
    const args = Object.entries(schema.inputs)
      .filter(([_paramName, input]) => {
        // Discard empty optional values
        return !(input.optional && input.input === null);
      })
      .map(([paramName, input]) => {
        let code = `${paramName}=`;
        if (input.type === 'node') {
          code += `__out_${(input.input as INodeSchema).id}`;
        } else {
          const val: any = input.input;
          if (typeof val === 'boolean') {
            code += val ? 'True' : 'False';
          } else if (val !== null) {
            code += JSON.stringify(val);
          } else {
            code += 'MISSING';
          }
        }
        return code;
      })
      .join(', ');
    let code = `__out_${schema.id} = registry.nodes["${schema.function.name}"](${args})\n`;
    code += `__out_${schema.id}`;
    return code;
  }
}
