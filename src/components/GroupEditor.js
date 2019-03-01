import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';
import { Warning, NameInput, Keyword } from './Form';

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
				name: '',
				parent: this.props.path,
				offset: '0',

				error: undefined
			};
		}
	}

	validate = (key, val) => {
		const validator = {
			'name': value => {
				if (value.match(/^[a-zA-Z][a-zA-Z0-9_ ]*$/)) {
					return [true];
				} else if (value.match(/^\s*$/)) {
					return [false, <li key="name">Group name: it cannot be empty.</li>]
				} else {
					return [false, <li key="name">Group name: <Keyword>{value}</Keyword> is an invalid name</li>];
				}
			},
			'parent': value => {
				if (value.match(/^\/[/a-zA-Z0-9_ ]*$/)) {
					return [true];
				} else if (value.match(/^\s*$/)) {
					return [false, <li key="parent">Group parent: it cannot be empty.</li>]
				} else {
					return [false, <li key="parent">Group parent: <Keyword>{value}</Keyword> is an invalid name</li>];
				}
			},
			'offset': value => {
				if (value.match(/^[0-9a-f]+$/i)) {
					return [true];
				} else if (value.match(/^\s*$/)) {
					return [false, <li key="offset">Group offset: it cannot be empty.</li>]
				}  else {
					return [false, <li key="offset">Group offset: <Keyword>{value}</Keyword> is an invalid hex number</li>]
				}
			}
		};

		let error = [];
		
		for (let prop in validator) {
			let rv;
			if (key === prop) {
				rv = validator[prop](val);
			} else {
				rv = validator[prop](this.state[prop]);
			}

			if (!rv[0]) {
				error.push(rv[1]);
			}
		}

		if (error.length) {
			return <ul>{error}</ul>;
		} else {
			return null;
		}
	}
	
	onInputChange = (e) => {
		const target = e.target;
		const name = target.name;
		const value = target.value;

		this.setState({
			[name]: value,
			error: this.validate(name, value)
		});
	}

	commitChange = () => {
		const data = {
			name: this.state.name + '/',
			parent: this.state.parent.endsWith('/') ? this.state.parent : this.state.parent + '/',
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
			const parent = this.state.parent.endsWith('/') ? this.state.parent : this.state.parent + '/';
			return (
				<Redirect to={"/view" + parent + this.state.name + "/"}/>
			);
		}

		return (
			<Fragment>
				<div className="group-editor">
					<label name="name-label">Name:</label>
					<NameInput name="name" required onChange={this.onInputChange} value={this.state.name || ""}/>
					
					<label name="parent-label">Parent:</label>
					{ 
						this.props.op === '/edit' ? 
						<input name="parent" type="text" required onChange={this.onInputChange} value={this.state.parent || ""}/> :
						<label>{this.state.parent}</label>
					}

					
					<label name="offset-label">Offset:</label>
					<input name="offset" type="text" required onChange={this.onInputChange} value={this.state.offset || ""}/>

					<button 
						onClick={this.commitChange} 
						disabled={this.state.error}>
						Done
					</button>
				</div>

				<Warning>{this.state.error}</Warning>
			</Fragment>
		);
 	}
}

export default GroupEditor;
