import { ReactWidget } from '@jupyterlab/apputils';

import React from 'react';

/**
 * React component for a counter.
 *
 * @returns The React component
 */
const GraphComponent = () : JSX.Element => {
    return (
        <div>
            Hello!
        </div>
    );
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
}