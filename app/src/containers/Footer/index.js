import React from 'react';
import packageJson from '../../../package.json';

import './Footer.css';

export default () => (
  <div className="footer">v{packageJson.version}</div>
);
