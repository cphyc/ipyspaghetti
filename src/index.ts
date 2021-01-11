import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the node_editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'node_editor:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension node_editor is activated!');

    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The node_editor server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default extension;
