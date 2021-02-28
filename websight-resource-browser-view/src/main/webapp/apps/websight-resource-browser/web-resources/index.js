import React from 'react';
import ReactDOM from 'react-dom';

import 'websight-admin/GlobalStyle';

import ResourceBrowser from './ResourceBrowser.js';

class App extends React.Component {
    render() {
        return (
            <ResourceBrowser />
        );
    }
}

ReactDOM.render(<App/>, document.getElementById('app-root'));