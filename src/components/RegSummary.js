import React, { Component } from 'react';
import { Link } from "react-router-dom";

import "./RegSummary.css";

//------------------------------------------------------------
class RegSummary extends Component {
	// static propTypes = {
	// 	base: PropTypes.number.isRequired,
 //    register: PropTypes.object.isRequired
 //  };

  render() {
  	const base = this.props.base;
    const reg  = this.props.data;
    return (
      <Link className="reg-summary" 
            to={{
              pathname: "/view" + reg.parent + reg.name, 
              state: {data: reg}
            }} 
      >
        <span>{reg.name}</span>
        <span>{reg.desc_short}</span>
        <span>{(base + parseInt(reg.offset, 16)).toString(16)}</span>
        <span>+{reg.offset}</span>
      </Link>
    );
  }
}

export default RegSummary;
