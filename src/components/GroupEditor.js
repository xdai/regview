import React, { Component } from 'react';
import { Redirect } from "react-router-dom";

import { RegContext } from '../RegDb';

import './GroupEditor.css';

//------------------------------------------------------------
class GroupEditor extends Component {
	static contextType = RegContext;

	constructor(props) {
		super(props);

		console.log(this.props);
		if (this.props.data) {
			const node = this.props.data.node;
			this.state = {
				name: node.name.slice(0, -1),
				parent: node.parent,
				offset: node.offset
			};
		} else {
			this.state = {
				name: undefined,
				parent: undefined,
				offset: 0
			};
		}
	}
	
	onInputChange = (e) => {
		const target = e.target;
		const name = target.name;
		const value = target.value;

		this.setState({
			[name]: value
		});
	}

	commitChange = () => {
		const db = this.context;
		db.set(this.props.path, {
			name: this.state.name + '/',
			parent: this.state.parent,
			offset: this.state.offset
		}).then(() => {
			this.setState({
				done: true
			});
		});
	}

	
	render() {
		if (this.state.done) {
			return (
				<Redirect to={"/view" + this.state.parent + this.state.name + "/"}/>
			);
		}
		
		return (
			<div className="group-editor">
				<label name="name-label">Name:</label>
				<input name="name" type="text" required onChange={this.onInputChange} value={this.state.name || ""}/>
				
				<label name="parent-label">Parent:</label>
				<label>{this.state.parent}</label>
				
				<label name="offset-label">Offset:</label>
				<input name="offset" type="text" required onChange={this.onInputChange} value={this.state.offset || ""}/>

				<button 
					onClick={this.commitChange} 
					disabled={!(this.state.offset && this.state.name)}>
					Done
				</button>
			</div>
		);
 	}
}

export default GroupEditor;
