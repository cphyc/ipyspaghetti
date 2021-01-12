// import { graph, nodes, NodeSchema, connections, exec } from "./api";
import {
    SerializedLGraphNode,
    LiteGraph,
    LGraph,
    LGraphCanvas,
    LGraphNode,
    INodeOutputSlot,
    INodeInputSlot,
    INodeSlot,
    LLink
} from "litegraph.js";

// @ts-ignore
import hash from "object-hash";
// @ts-ignore
import converter from "hsl-to-rgb-for-reals";


const PYTHON_NODE = 1;

function configureSocket(id: string, optional: boolean):Partial<INodeSlot> {
    let h = hash(id);
    let maxVal = parseInt("f".repeat(h.length), 16);
    let hue = Math.floor(parseInt(h, 16) / maxVal * 360);
    let ret: Partial<INodeSlot> = {
        color_on: LiteGraph.num2hex(converter(hue, 1, 0.7)),
        color_off: LiteGraph.num2hex(converter(hue, 1, 0.65))
    };
    if (optional) {
        ret.shape = LiteGraph.BOX_SHAPE;
    } else {
        ret.shape = LiteGraph.CARD_SHAPE;
    }
    return ret
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

        constructor(title? : string) {
            super(title)

            this.title = node.name;

            for (let [name, iinfos] of Object.entries(node.inputs)) {
                let infos = iinfos as any;
                let ntype = gh.normalize_type(infos.type);
                let extra = gh.getSocketConfiguration(ntype, infos.optional);

                this.addInput(name, ntype, extra);
                console.log(`${node.name}.input ${name} -> ${ntype}`)
            }
            for (let [name, iinfos] of Object.entries(node.outputs)) {
                // TODO: cleaner
                let infos = iinfos as any;
                let ntype = gh.normalize_type(infos["type"]);
                this.addOutput(name, ntype, gh.getSocketConfiguration(ntype, infos.optional));
                console.log(`${node.name}.output ${name} -> ${ntype}`);
            }
            this.setState(NodeState.DIRTY);
            // @ts-ignore
            this.setProperty("count", 0);
            // @ts-ignore
            this.setProperty("previous_input", []);
            // @ts-ignore
            this.setProperty("type", PYTHON_NODE)
        }

        getTitle() {
            return node.name;
        }

        setState(state: NodeState) {
            // @ts-ignore
            this.setProperty("state", state);
            let bg_colors = {
                1: "green",  // Clean
                2: "red",    // Missing
                4: "purple", // Dirty
                8: "blue"    // Running
            }
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
                let orig = this.getInputNode(i) as NewNode;
                let input = this.inputs[i];

                // Missing non-optional input
                // @ts-ignore
                if (!(node.inputs[input.name].optional || orig)) {
                    state = NodeState.MISSING;
                    break;
                }
                if (!orig)
                    continue;

                // Check upstream node was updated
                let prev_input = this.properties["previous_input"][i];
                let new_input = this.getInputData(i);
                if (JSON.stringify(prev_input) != JSON.stringify(new_input)) {
                    state = NodeState.DIRTY;
                }
            }
            this.setState(state);
            return state;
        }

        onExecute () {
            let state = this.updateNodeState();
            if (state != NodeState.DIRTY) {
                for (let iout = 0; iout < this.outputs.length; ++iout) {
                    let val = (this.getOutputData(iout) || 0);
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
            let inputData = this.inputs.map((input, index) => {
                return this.getInputData(index)
            });
            // @ts-ignore
            this.setProperty("previous_input", inputData);

            // We update the output *before* the node has run so that
            // nodes downstream also register to run.
            for (let iout = 0; iout < this.outputs.length; ++iout) {
                let val = (this.getOutputData(iout) || 0);
                this.setOutputData(iout, val+1);
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
        onRemoved() {
            // TODO
            // nodes.delete(this.id);
        }
        onAdded() {
            // TODO
            // nodes.create({id: this.id, info: node});
        }
        onAction(action: any, param: any) {
            console.log(action);
        }

        onConnectionsChange(
            type: number,
            slotIndex: number,
            isConnected: boolean,
            link: LLink,
            ioSlot: (INodeOutputSlot | INodeInputSlot)
        ) {
            // Happens on node creation
            if (!link) return;

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

        onConfigure(o: SerializedLGraphNode) {
            this.setState(NodeState.DIRTY);
        }
    }

    LiteGraph.registerNodeType(`mynodes/${node.name}`, NewNode);
}

export class GraphHandler {
    graph: LGraph;
    canvas: LGraphCanvas;
    socketConfiguration: Map<string, Partial<INodeSlot>>;

    parent_connections: Map<string, string>;

    callbacks: {[id: string] : Array<Function>} = {
        "loaded": []
    }
    hasLoaded: boolean = false;

    constructor(containerId: string) {
        // Empty list of registered node types
        LiteGraph.clearRegisteredTypes()

        this.graph = new LGraph();
        this.canvas = new LGraphCanvas(containerId, this.graph);
        let font = getComputedStyle(document.documentElement)
            .getPropertyValue('--jp-ui-font-family');
        this.canvas.title_text_font = font;
        this.canvas.inner_text_font = font;
        this.parent_connections = new Map();

        this.socketConfiguration = new Map<string, Partial<INodeSlot>>();

        this.load_components();
    }

    known_types: {[id: string] : string | null} = {
        "typing.Any": null,
        "<class 'str'>": "string",
        "<class 'int'>": "int",
        "<class 'float'>": "float",
        "<class 'bool'>": "boolean"
    }

    normalize_type(type: string) {
        if (type in this.known_types) {
            return this.known_types[type]
        } else if (type in this.parent_connections) {
            return this.parent_connections.get(type);
        } else {
            return type;
        }
    }

    async load_components() {
        // TODO
        // let all_nodes: Array<NodeSchema> = (await nodes.index()).data;
        // let ret = await connections.index();
        // for (const [key, value] of Object.entries(ret.data)) {
        //     this.parent_connections.set(key, <string> value);
        // }
        // all_nodes.forEach((node: NodeSchema) => nodeFactory(this, node));

        this.hasLoaded = true;
        while (this.callbacks["loaded"].length > 0) {
            this.callbacks["loaded"].pop()()
        }
    }

    on(event: string, callback: Function) {
        // @ts-ignore
        this.callbacks[event].push(callback);
    }

    getSocketConfiguration (socket: string, optional: boolean) {
        if (this.socketConfiguration.has(socket)) {
            return this.socketConfiguration.get(socket);
        } else {
            let config = configureSocket(socket, optional);
            this.socketConfiguration.set(socket, config);
            return config;
        }
    }

    save() {
        // TODO
        // let data = this.graph.serialize();
        // graph.create(data);
    }

    load(name?: string) {
        let loadNow = () => {
            // TODO
            // graph.index().then(reply => {
            //     this.graph.configure(reply.data);
            // });
        };
        if (this.hasLoaded)
            loadNow();
        else
            this.on("loaded", loadNow);
    }
}
