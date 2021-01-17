import { SessionContext } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IExecuteReplyMsg } from '@jupyterlab/services/lib/kernel/messages';

import { JSONObject } from '@lumino/coreutils';

import { BoxPanel } from '@lumino/widgets';

import { GraphEditor } from './graph_widget';

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
}
export interface INodeSchema {
  id: number,
  function: IFunctionSchema;
  inputs: { [paramName: string]: INodeSchemaIO };
}

export class GraphAPI {
  private _graphWidget: GraphEditor;
  private _funContainer: BoxPanel;
  private _nodeContainer: BoxPanel;

  private _rendermime: IRenderMimeRegistry;
  private _sessionContext: SessionContext;

  private _globalCodeCell: FunctionEditor;

  constructor(sessionContext: SessionContext, rendermime: IRenderMimeRegistry) {
    this._sessionContext = sessionContext;
    this._rendermime = rendermime;
  }

  setWidgets(
    graphWidget: GraphEditor,
    funContainer: BoxPanel,
    nodeContainer: BoxPanel
  ): void {
    this._graphWidget = graphWidget;
    this._funContainer = funContainer;
    this._nodeContainer = nodeContainer;
    const model = new CodeCellModel({});
    this._globalCodeCell = new FunctionEditor(
      {
        inputs: {},
        outputs: {},
        name: 'Global namespace',
        source: ''
      },
      {
        model,
        rendermime: this._rendermime
      }
    );
    this._funContainer.addWidget(this._globalCodeCell);
    this._globalCodeCell.show();
  }

  setupGlobals(source: string): void {
    if (!this._globalCodeCell) {
      console.error('Missing global code cell');
      return;
    }
    console.debug('Setting global code value');
    this._globalCodeCell.model.value.text = source;
  }

  executeGlobals(): void {
    if (!this._globalCodeCell) {
      console.error('Missing global code cell');
      return;
    }
    console.debug('Executing global code value');
    this._globalCodeCell.execute(this._sessionContext);
  }

  //--------------------------------------------------------
  createFunction(schema: IFunctionSchema): void {
    // Create the editor zone
    const model = new CodeCellModel({});
    model.value.text = schema.source;
    const editor = new FunctionEditor(schema, {
      model,
      rendermime: this._rendermime
    }).initializeState();
    editor.hide();
    this._funContainer.addWidget(editor);

    // TODO: Add the function to the graph
    this._graphWidget;
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

  //--------------------------------------------------------
  //--------------------------------------------------------
  createNode(schema: INodeSchema): void {
    // Create the editor zone
    const model = new CodeCellModel({});
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
    const tmp = this._funContainer.widgets.filter(w => {
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
    const { editor } = this;
    editor.setOption('readOnly', false);
  }
}

/** Show a node */
class NodeViewer extends GenericCodeCell<INodeSchema> {
  constructor(schema: INodeSchema, options: CodeCell.IOptions) {
    super(schema, options);
    const { editor } = this;
    editor.setOption('readOnly', true);
  }
}

namespace NodeViewer {
  export function createCode(schema: INodeSchema): string {
    const args = Object.entries(schema.inputs).map(([paramName, input]) => {
        let code = `${paramName}=`;
        if (input.type === 'node') {
          code += `__out${(input.input as INodeSchema).id}`;
        } else {
          const val: any = input.input;
          if (typeof val === 'boolean') {
            code += val ? 'True' : 'False';
          } else {
            code += JSON.stringify(val);
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