import { ReactWidget} from '@jupyterlab/apputils';

import React from 'react';

import { GraphHandler } from './graph';

/**
 * React component for a counter.
 *
 * @returns The React component
 */

let current_id = 0;
class GraphComponent extends React.Component {
    myId: string;
    componentDidMount() {
        const graph = new GraphHandler(this.myId);
        console.log(graph);
    }

    render() {
        this.myId = `#graph-${current_id}`;
        current_id++;
        return (
            <div id={this.myId}>
                Hello!
            </div>
        );
    }
};

export class GraphWidget extends ReactWidget {
    /**
    * Constructs a new CounterWidget.
    */
    constructor() {
        super();
        this.addClass('jp-graphContainerWidget');
    }

    render(): JSX.Element {
        return <GraphComponent />
    }

    dispose(): void {
        this.graph.graph.stop();
    }

    private graph: GraphHandler
}