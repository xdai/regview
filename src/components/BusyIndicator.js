import React, { Component } from 'react';

import './BusyIndicator.css';

//------------------------------------------------------------
class BusyIndicator extends Component {
  
  render() {
    return this.props.enabled ? (
      <div className="busy-indicator"></div>
    ) : null;
  }
}

export default BusyIndicator;
