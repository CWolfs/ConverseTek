import React from 'react';
import { Link } from 'react-router-dom';

import "./Conversations.css";

export default () => (
  <div className="conversations">
    <div>Conversations</div>
    <Link to="/test">Test Link</Link>
  </div>
);
