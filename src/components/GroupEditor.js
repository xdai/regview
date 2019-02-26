import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';
import { Warning, NameInput } from './Form';

import './GroupEditor.css';

//------------------------------------------------------------
/*
 * Props:
 *   - data
 *      - undefined, create new group
 *      - otherwise, edit existing one
 *   - path
 *      - 
 */
class GroupEditor extends Component {
	constructor(props) {
		super(props);

		if (this.props.op === '/edit') {
			const node = this.props.data.node;
			this.state = {
				name: node.name.slice(0, -1),
				parent: node.parent,
				offset: node.offset,
				
				error: undefined
			};
		} else {
			this.state = {
				name: undefined,
				parent: this.props.path,
				offset: 0,

				error: undefined
			};
		}
	}
	
	onInputChange = (e) => {
		const target = e.target;
		const name = target.name;
		const value = target.value;

		this.setState({
			[name]: value,
			error: undefined
		});
	}

	commitChange = () => {
		const data = {
			name: this.state.name + '/',
			parent: this.state.parent,
			offset: this.state.offset
		};

		let promise;
		if (this.props.op === '/edit') { // update
			promise = regDb.set(this.props.path, data);
		} else { // add
			promise = regDb.add(data);
		}

		promise.then(() => {
			this.setState({
				done: true
			});
		}).catch((error) => {
			this.setState({
				error: error.message
			});
		});
	}
	
	render() {
		if (this.state.done) {
			return (
				<Redirect to={"/view" + this.state.parent + this.state.name + "/"}/>
			);
		}

		let errorMsg = null;
		if (this.state.error) {
			errorMsg = <Warning>{this.state.error}</Warning>;
		}
		
		return (
			<Fragment>
				<div className="group-editor">
					<label name="name-label">Name:</label>
					<NameInput name="name" required onChange={this.onInputChange} value={this.state.name || ""}/>
					
					<label name="parent-label">Parent:</label>
					{ 
						this.state.mode === 'new' ? 
						<label>{this.state.parent}</label> :
						<input name="parent" type="text" required onChange={this.onInputChange} value={this.state.parent || ""}/>
					}

					
					<label name="offset-label">Offset:</label>
					<input name="offset" type="text" required onChange={this.onInputChange} value={this.state.offset || ""}/>

					<button 
						onClick={this.commitChange} 
						disabled={!(this.state.offset && this.state.name)}>
						Done
					</button>
				</div>

				{errorMsg}
			</Fragment>
		);
 	}
}

export default GroupEditor;
