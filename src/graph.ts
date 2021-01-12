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

const PYTHON_NODE = 1;

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

enum NodeState {
  CLEAN = 1,
  MISSING = 2,
  DIRTY = 4,
  RUNNING = 8
}

// @ts-ignore
function nodeFactory(gh: GraphHandler, node: NodeSchema) {
  class NewNode extends LGraphNode {
    mode = LiteGraph.ALWAYS;
    type = `mynodes/${node.name}`;

    static title = node.name;

    constructor(title?: string) {
      super(title);

      this.title = node.name;

      for (const [name, iinfos] of Object.entries(node.inputs)) {
        const infos = iinfos as any;
        const ntype = gh.normalizeType(infos.type);
        const extra = gh.getSocketConfiguration(ntype, infos.optional);

        this.addInput(name, ntype, extra);
        console.log(`${node.name}.input ${name} -> ${ntype}`);
      }
      for (const [name, iinfos] of Object.entries(node.outputs)) {
        // TODO: cleaner
        const infos = iinfos as any;
        const ntype = gh.normalizeType(infos['type']);
        this.addOutput(
          name,
          ntype,
          gh.getSocketConfiguration(ntype, infos.optional)
        );
        console.log(`${node.name}.output ${name} -> ${ntype}`);
      }
      this.setState(NodeState.DIRTY);
      // @ts-ignore
      this.setProperty('count', 0);
      // @ts-ignore
      this.setProperty('previous_input', []);
      // @ts-ignore
      this.setProperty('type', PYTHON_NODE);
    }

    getTitle(): string {
      return node.name;
    }

    setState(state: NodeState): void {
      // @ts-ignore
      this.setProperty('state', state);
      const bg_colors = {
        1: 'green', // Clean
        2: 'red', // Missing
        4: 'purple', // Dirty
        8: 'blue' // Running
      };
      this.boxcolor = bg_colors[state];
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
        // @ts-ignore
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
        if (JSON.stringify(prevInput) != JSON.stringify(newInput)) {
          state = NodeState.DIRTY;
        }
      }
      this.setState(state);
      return state;
    }

    onExecute() {
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
      // TODO
      // let parameters = this.inputs
      // .map((input) => {
      //     if (!input.link) return;

      //     let link = gh.graph.links[input.link];
      //     let from_node = gh.graph.getNodeById(link.origin_id);
      //     if (from_node.properties["type"] == PYTHON_NODE) {
      //         return {
      //             name: input.name,
      //             node_id: from_node.id,
      //             socket: link.origin_slot,
      //             data: null
      //         }
      //     } else {
      //         return {
      //             name: input.name,
      //             node_id: from_node.id,
      //             socket: link.origin_slot,
      //             data: from_node.getOutputData(link.origin_slot)
      //         }
      //     }
      // }).filter(elem => elem);

      // Set previous input data
      const inputData = this.inputs.map((input, index) => {
        return this.getInputData(index);
      });
      // @ts-ignore
      this.setProperty('previous_input', inputData);

      // We update the output *before* the node has run so that
      // nodes downstream also register to run.
      for (let iout = 0; iout < this.outputs.length; ++iout) {
        const val = this.getOutputData(iout) || 0;
        this.setOutputData(iout, val + 1);
      }

      // TODO
      // exec.update(this.id, {id: this.id, info: node, parameters: parameters})
      // .then(reply => {
      //     this.setState(NodeState.CLEAN);
      //     if (node.name == "show") {
      //         $("#stdout").html(reply.data.stdout);
      //         $("#stderr").html(reply.data.stderr);
      //     }
      // })
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
    onAction(action: any, param: any): void {
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
  private graph: LGraph;
  private canvas: LGraphCanvas;
  private socketConfiguration: Map<string, Partial<INodeSlot>>;

  private parentConnections: Map<string, string>;

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

  constructor(containerId: string) {
    this.setupGraph();
    this.setupCanvas(containerId);

    this.parentConnections = new Map();

    this.socketConfiguration = new Map<string, Partial<INodeSlot>>();

    this.loadComponents();
  }

  setupGraph(): void {
    // Empty list of registered node types
    // LiteGraph.clearRegisteredTypes()

    // TODO: do not recreate a graph each time the widget is
    // detached, simply reattach to a new canvas
    this.graph = new LGraph();

    // Reduce font size for groups
    // @ts-ignore
    const prev_ctor = LGraphGroup.prototype._ctor;
    // @ts-ignore
    LGraphGroup.prototype._ctor = function(title) {
      prev_ctor.bind(this)(title);
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/camelcase
      this.font_size = 14;
    };

    // Add custom events
    const graph = this.graph;
    for (const nodeClass of Object.values(LiteGraph.Nodes)) {
      nodeClass.prototype.onKeyUp = function(e: KeyboardEvent): void {
        if (e.key === 'Delete') {
          graph.remove(this);
        }
      };
    }
  }

  setupCanvas(containerId: string): void {
    this.canvas = new LGraphCanvas(containerId, this.graph);
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
      return this.parentConnections.get(type);
    } else {
      return type;
    }
  }

  async loadComponents(): Promise<void> {
    // TODO
    // let all_nodes: Array<NodeSchema> = (await nodes.index()).data;
    // let ret = await connections.index();
    // for (const [key, value] of Object.entries(ret.data)) {
    //     this.parent_connections.set(key, <string> value);
    // }
    // all_nodes.forEach((node: NodeSchema) => nodeFactory(this, node));

    this.hasLoaded = true;
    while (this.callbacks['loaded'].length > 0) {
      this.callbacks['loaded'].pop()();
    }
  }

  on(event: string, callback: Function): void {
    // @ts-ignore
    this.callbacks[event].push(callback);
  }

  getSocketConfiguration(
    socket: string,
    optional: boolean
  ): Partial<INodeSlot> {
    if (this.socketConfiguration.has(socket)) {
      return this.socketConfiguration.get(socket);
    } else {
      const config = configureSocket(socket, optional);
      this.socketConfiguration.set(socket, config);
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
}
