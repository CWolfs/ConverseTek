/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const render = () => {
  ReactDOM.render(<App />, document.getElementById('root'));
};

render();
