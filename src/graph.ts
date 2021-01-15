// import { graph, nodes, NodeSchema, connections, exec } from "./api";
import {
  SerializedLGraphNode,
  LiteGraph,
  LGraph,
  LGraphCanvas,
  LGraphNode,
  LGraphGroup,
  INodeOutputSlot,
  INodeInputSlot,
  INodeSlot,
  LLink
} from 'litegraph.js';

// @ts-ignore
import hash from 'object-hash';
// @ts-ignore
import converter from 'hsl-to-rgb-for-reals';
import { IExecuteReplyMsg } from '@jupyterlab/services/lib/kernel/messages';

const PYTHON_NODE = 1;

export interface INodeSchemaIO {
  type: string;
  optional: boolean;
}
export interface INodeSchema {
  inputs: { [id: string]: INodeSchemaIO };
  outputs: { [id: string]: INodeSchemaIO };
  name: string;
  source: string;
}

export interface IOParameters {
  name: string;
  node_id: number;
  socket: number;
  data: any;
}

export interface IExecuteCellOptions {
  id: number;
  info: INodeSchema;
  parameters: IOParameters[];
}

export interface INodeCallback {
  (id: number, options: IExecuteCellOptions): Promise<IExecuteReplyMsg>;
}

enum NodeState {
  CLEAN = 1,
  MISSING = 2,
  DIRTY = 4,
  RUNNING = 8,
  ERROR = 16
}

function configureSocket(id: string, optional: boolean): Partial<INodeSlot> {
  const h = hash(id);
  const maxVal = parseInt('f'.repeat(h.length), 16);
  const hue = Math.floor((parseInt(h, 16) / maxVal) * 360);
  const ret: Partial<INodeSlot> = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    color_on: LiteGraph.num2hex(converter(hue, 1, 0.7)),
    // eslint-disable-next-line @typescript-eslint/camelcase
    color_off: LiteGraph.num2hex(converter(hue, 1, 0.65))
  };
  if (optional) {
    ret.shape = LiteGraph.BOX_SHAPE;
  } else {
    ret.shape = LiteGraph.CARD_SHAPE;
  }
  return ret;
}

class PyLGraphNode extends LGraphNode {
  setProperty(key: string, value: any): void {
    // Missing declaration in d.ts file
    //@ts-ignore
    super.setProperty(key, value);
  }

}

function nodeFactory(gh: GraphHandler, node: INodeSchema): void {
  class NewNode extends PyLGraphNode {
    mode = LiteGraph.ALWAYS;
    type = `mynodes/${node.name}`;

    static title = node.name;

    getNode(): INodeSchema {
      return node;
    }
    get node(): INodeSchema {
      return this.getNode();
    }

    constructor(title?: string) {
      super(title);

      this.title = this.node.name;

      for (const [name, infos] of Object.entries(this.node.inputs)) {
        const ntype = gh.normalizeType(infos.type);
        const extra = gh.getSocketConfiguration(ntype, infos.optional);

        this.addInput(name, ntype, extra);
        console.log(`${node.name}.input ${name} -> ${ntype}`);
      }
      for (const [name, infos] of Object.entries(node.outputs)) {
        // TODO: cleaner
        const ntype = gh.normalizeType(infos['type']);
        this.addOutput(
          name,
          ntype,
          gh.getSocketConfiguration(ntype, infos.optional)
        );
        console.log(`${node.name}.output ${name} -> ${ntype}`);
      }
      this.setState(NodeState.DIRTY);
      this.setProperty('count', 0);
      this.setProperty('previous_input', []);
      this.setProperty('type', PYTHON_NODE);
    }

    getTitle(): string {
      return node.name;
    }

    setState(state: NodeState): void {
      this.setProperty('state', state);
      // di
      const bgColors = {
        1: 'green',   // Clean
        2: '#880000', // Missing
        4: 'purple',  // Dirty
        8: 'blue',    // Running
        16: '#ff0000' // Error
      };
      this.boxcolor = bgColors[state];
      // Redraw canvas
      this.setDirtyCanvas(false, true);
    }

    /**
     * returns whether the node is dirty, can run or is clean
     * @method getNodeState
     */
    updateNodeState(): NodeState {
      let state: NodeState = this.properties.state;

      // If any input was modified: mark as dirty
      // If any input is missing: mark as missing
      for (let i = 0; i < this.inputs.length; i++) {
        const orig = this.getInputNode(i) as NewNode;
        const input = this.inputs[i];

        // Missing non-optional input
        if (!(node.inputs[input.name].optional || orig)) {
          state = NodeState.MISSING;
          break;
        }
        if (!orig) {
          continue;
        }

        // Check upstream node was updated
        const prevInput = this.properties['previous_input'][i];
        const newInput = this.getInputData(i);
        if (JSON.stringify(prevInput) !== JSON.stringify(newInput)) {
          state = NodeState.DIRTY;
        }
      }
      this.setState(state);
      return state;
    }

    onExecute(): void {
      const state = this.updateNodeState();
      if (state !== NodeState.DIRTY) {
        for (let iout = 0; iout < this.outputs.length; ++iout) {
          const val = this.getOutputData(iout) || 0;
          this.setOutputData(iout, val);
        }
        return;
      }

      this.setState(NodeState.RUNNING);

      // Gather inputs
      const parameters = this.inputs
        .map(input => {
          if (!input.link) {
            return;
          }

          const link = gh.graph.links[input.link];
          const fromNode = gh.graph.getNodeById(link.origin_id);
          let ret: IOParameters;
          if (fromNode.properties['type'] === PYTHON_NODE) {
            ret = {
              name: input.name,
              // eslint-disable-next-line @typescript-eslint/camelcase
              node_id: fromNode.id,
              socket: link.origin_slot,
              data: null
            };
          } else {
            ret = {
              name: input.name,
              // eslint-disable-next-line @typescript-eslint/camelcase
              node_id: fromNode.id,
              socket: link.origin_slot,
              data: fromNode.getOutputData(link.origin_slot)
            };
          }
          return ret;
        })
        .filter(elem => elem);

      // Set previous input data
      const inputData = this.inputs.map((input, index) => {
        return this.getInputData(index);
      });

      this.setProperty('previous_input', inputData);

      // We update the output *before* the node has run so that
      // nodes downstream also register to run.
      for (let iout = 0; iout < this.outputs.length; ++iout) {
        const val = this.getOutputData(iout) || 0;
        this.setOutputData(iout, val + 1);
      }

      gh.executeCell(this.id, {
        id: this.id,
        info: node,
        parameters: parameters
      })
        .then(ret => {
          this.setState(NodeState.CLEAN);
          console.debug('executed', ret);
        })
        .catch(err => {
          this.setState(NodeState.ERROR);
          console.error('Error!', err);
        });
      console.log(`Executing ${this.getTitle()} #${this.id}`);
    }
    onRemoved(): void {
      // TODO
      // nodes.delete(this.id);
    }
    onAdded(): void {
      // TODO
      // nodes.create({id: this.id, info: node});
    }
    onAction(action: string, param: any): void {
      console.log(action);
    }

    onConnectionsChange(
      type: number,
      slotIndex: number,
      isConnected: boolean,
      link: LLink,
      ioSlot: INodeOutputSlot | INodeInputSlot
    ): void {
      // Happens on node creation
      if (!link) {
        return;
      }

      // TODO: restore
      // let data = {
      //     to: {
      //         id: link.target_id,
      //         socket: link.target_slot
      //     },
      //     from: {
      //         id: link.origin_id,
      //         socket: link.origin_slot
      //     }
      // };
      this.updateNodeState();
      if (!isConnected) {
        // TODO
        //connections.delete(data);
      } else {
        // TODO
        // connections.create(data);
      }
    }

    onConfigure(o: SerializedLGraphNode): void {
      this.setState(NodeState.DIRTY);
    }
  }

  LiteGraph.registerNodeType(`mynodes/${node.name}`, NewNode);
}

export class GraphHandler {
  private _graph: LGraph;
  private canvas: LGraphCanvas;
  private socketConfiguration: { [id: string]: Partial<INodeSlot> };

  private parentConnections: { [id: string]: string };

  private callbacks: { [id: string]: Array<Function> } = {
    loaded: []
  };
  private hasLoaded = false;

  private known_types: { [id: string]: string | null } = {
    'typing.Any': null,
    "<class 'str'>": 'string',
    "<class 'int'>": 'int',
    "<class 'float'>": 'float',
    "<class 'bool'>": 'boolean'
  };

  executeCell: INodeCallback;

  constructor(containerId: string, executeCell: INodeCallback) {
    this.setupGraph();
    this.setupCanvas(containerId);

    this.parentConnections = {};
    this.socketConfiguration = {};

    this.executeCell = executeCell;
  }

  setupGraph(): void {
    // Empty list of registered node types
    // LiteGraph.clearRegisteredTypes()

    // TODO: do not recreate a graph each time the widget is
    // detached, simply reattach to a new canvas
    this._graph = new LGraph();

    // Reduce font size for groups
    // @ts-ignore
    const prevCtor = LGraphGroup.prototype._ctor;
    // @ts-ignore
    LGraphGroup.prototype._ctor = function(title): void {
      prevCtor.bind(this)(title);
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/camelcase
      this.font_size = 14;
    };

    // Add custom events
    const graph = this._graph;
    for (const nodeClass of Object.values(LiteGraph.Nodes)) {
      nodeClass.prototype.onKeyUp = function(e: KeyboardEvent): void {
        if (e.key === 'Delete') {
          graph.remove(this);
        }
      };
    }
  }

  setupCanvas(containerId: string): void {
    this.canvas = new LGraphCanvas(containerId, this._graph);
    const font = getComputedStyle(document.documentElement).getPropertyValue(
      '--jp-ui-font-family'
    );
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.canvas.title_text_font = font;
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.canvas.inner_text_font = font;
  }

  normalizeType(type: string): string {
    if (type in this.known_types) {
      return this.known_types[type];
    } else if (type in this.parentConnections) {
      return this.parentConnections[type];
    } else {
      return type;
    }
  }

  loadComponents(allNodes: Array<INodeSchema>): void {
    console.log(LiteGraph);
    for (const node of Object.values(allNodes)) {
      if (node.name in LiteGraph.Nodes) {
        // TODO: update schema
        // const lgNode = LiteGraph.Nodes[node.name];
      } else {
        // New node
        nodeFactory(this, node);
      }
    }

    this.hasLoaded = true;
    while (this.callbacks['loaded'].length > 0) {
      this.callbacks['loaded'].pop()();
    }
  }

  on(event: string, callback: Function): void {
    this.callbacks[event].push(callback);
  }

  getSocketConfiguration(
    socket: string,
    optional: boolean
  ): Partial<INodeSlot> {
    if (socket in this.socketConfiguration) {
      return this.socketConfiguration[socket];
    } else {
      const config = configureSocket(socket, optional);
      this.socketConfiguration[socket] = config;
      return config;
    }
  }

  save(): void {
    // TODO
    // let data = this.graph.serialize();
    // graph.create(data);
  }

  load(name?: string): void {
    const loadNow = function(): void {
      // TODO
      // graph.index().then(reply => {
      //     this.graph.configure(reply.data);
      // });
    };
    if (this.hasLoaded) {
      loadNow();
    } else {
      this.on('loaded', loadNow);
    }
  }

  createComponents(data: string): void {
    const conf = JSON.parse(data);
    this.loadComponents(conf);
  }

  loadGraph(data: string): void {
    const conf = JSON.parse(data);
    this._graph.configure(conf);
  }

  get graph(): LGraph {
    return this._graph;
  }
}
