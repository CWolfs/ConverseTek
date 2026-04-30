/* global document */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import 'core-js';

const render = () => {
  const rootElement = document.getElementById('root');
  if (rootElement == null) throw new Error('Application root element was not found.');

  createRoot(rootElement).render(<App />);
};

render();
