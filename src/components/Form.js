import React, { Component } from 'react';

import './Form.css';

//------------------------------------------------------------
export class Warning extends Component {
	render() {
		return (
			<div className="warning">
				{this.props.children}
			</div>
		);
 	}
}