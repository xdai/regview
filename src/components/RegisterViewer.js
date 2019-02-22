import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { RegContainer, Field, UnusedField } from './RegContainer';

import { num2hexstr } from './Utils';

import './RegisterViewer.css';

//------------------------------------------------------------
class RegisterViewer extends Component {
	constructor(props) {
		super(props);

		this.state = {
			decodeString: undefined,
			decodeArray: [],
			decodeError: undefined,
			focus: [0, 1]
		};
	}

	onInputChange = (e) => {
		const target = e.target;
		const name = target.name;
		const value = target.value;

		this.setState({
			[name]: value
		});
	}

	decode = () => {
		const re = /^(0x)?[0-9a-f]+$/i
		let segs = this.state.decodeString.split(',').map(s => s.trim()).filter(s => s !== '');

		let error = [];

		for (let i = 0; i < segs.length; i++) {
			if (!re.test(segs[i])) {
				error.push(
					<li key={i}>{segs[i]}</li>
				);
			}
		}

		if (error.length) {
			this.setState({
				decodeError: error
			})
		} else {
			this.setState({
				decodeArray: segs.map(n => parseInt(n, 16)),
				decodeError: undefined
			})
		}
		console.log(segs);
	}

	parseField = (val, [low, high]) => {
		const mask = (1 << (high + 1)) - 1;
		return (val & mask) >> low;
	}

	shiftFocus = (n) => {
		this.setState((state) => {
			let newFocus = state.focus.slice(0);
			newFocus.shift();
			newFocus.push(n);
			console.log(newFocus);
			return {
				focus: newFocus
			};
		})
	}

	getDescription = () => {
		const data = this.props.data.node;
		const address = this.props.data.address;
		
		return (
			<Fragment>
				<p>Address: 0x{address.toString(16).toUpperCase()}</p>
				<p>{data.desc_short}</p>
				<p>{data.desc_long}</p>
			</Fragment>
		);
	}

	getRegMap = () => {
		const fields = this.props.data.node.fields;

		let pos = 0;
		let children = [];
		
		for (let i = 0; i < fields.length; i++) {
			if (pos < fields[i].bits[0]) {
				children.push(
					<UnusedField key={pos} low={pos} high={fields[i].bits[0] - 1} width={32} />
				);
			}
			children.push(
				<Field key={fields[i].bits[0]} 
					{...fields[i]} 
					width={32}
					readonly
				/>
			);
			pos = fields[i].bits[1] + 1;
		}

		if (pos < this.props.data.node.size * 8) {
			children.push(
				<UnusedField key={pos} low={pos} high={this.props.data.node.size * 8 - 1} width={32} />
			);
		}

		return (
			<RegContainer width={32} size={this.props.data.node.size}>
				{children}
			</RegContainer>
		);
	}

	getFieldTable = () => {
		let rows = [];
		const fields = this.props.data.node.fields;

		let extraHeader = [];
		this.state.decodeArray.forEach((n, i) => {
			if (i === this.state.focus[0] || i === this.state.focus[1]) {
				extraHeader.push(
					<th key={i} className="focus-header">
						{num2hexstr(n)}
					</th>
				);
			} else {
				extraHeader.push(
					<th key={i} className="value-header" onClick={() => this.shiftFocus(i)}>
						{num2hexstr(n)}
					</th>
				);
			}
		});

		fields.forEach((field) => {
			let values = [];
			this.state.decodeArray.forEach((n, i) => {
				let otherVal;
				if (i === this.state.focus[0]) {
					otherVal = this.state.decodeArray[this.state.focus[1]];
				} else if (i === this.state.focus[1]) {
					otherVal = this.state.decodeArray[this.state.focus[0]];
				}

				let highlight;
				if (otherVal) {
					const a = this.parseField(n, field.bits);
					const b = this.parseField(otherVal, field.bits);
					highlight = (a !== b);
				} 
				values.push(
					<td key={i} className={highlight ? "highlight-field" : ""} >
						{this.parseField(n, field.bits)}
					</td>
				);
			});
			rows.push(
				<tr key={field.bits[0]}>
					<td>{field.name}</td>
					<td>{field.bits[1]}:{field.bits[0]}</td>
					<td>{field.meaning || "N/A"}</td>
					{values}
				</tr>
			);
		})

		return (
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Bit</th>
						<th>Description</th>
						{extraHeader}
					</tr>
				</thead>
				<tbody>
					{rows}
				</tbody>
			</table>
		);
	}

	getDecodeForm = () => {
		return (
			<Fragment>
				<p>
					<input name="decodeString" type="text" onChange={this.onInputChange} value={this.state.decodeString || ""} />
					<button onClick={this.decode}>Decode</button>
				</p>
				
				{ this.state.decodeError && <div className="warning">Invalid Hex number:<ul>{this.state.decodeError}</ul></div>}
			</Fragment>
		)
	}
	
	render() {
		if (this.props.data.node) {
			return (
				<Fragment>
					{this.getDescription()}
					{this.getRegMap()}
					{this.getFieldTable()}
					{this.getDecodeForm()}
				</Fragment>
			);
		} else {
			return (
				<Redirect to={"/edit" + this.props.path} />
			);
		}
	}
}



export default RegisterViewer;
