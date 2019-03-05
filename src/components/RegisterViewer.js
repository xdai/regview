import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { RegContainer, Field, UnusedField } from './RegContainer';
import { Warning } from './Form';

import { num2hexstr } from './Utils';

import './RegisterViewer.css';

//------------------------------------------------------------
class RegisterViewer extends Component {
	constructor(props) {
		super(props);

		this.state = {
			decodeString: undefined,
			decodeArray: [],
			decodeError: [],
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

	decode = (e) => {
		const target = e.target;
		const value = target.value;

		const re = /^(0x)?[0-9a-f]+$/i
		let segs = value.split(',').map(s => s.trim()).filter(s => s !== '');

		let error = [];

		for (let i = 0; i < segs.length; i++) {
			if (!re.test(segs[i])) {
				error.push(
					<li key={i}>{segs[i]}</li>
				);
			}
		}

			this.setState({
				decodeString: value,
				decodeArray: segs.filter(s => re.test(s)).map(s => parseInt(s, 16)),
				decodeError: error
			})

	}

	parseField = (val, [low, high]) => {
		const mask = (1 << (high - low + 1)) - 1;
		return (val >> low) & mask;
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

		if (fields.length === 0) {
			return null;
		}

		let extraHeader = [];
		this.state.decodeArray.forEach((n, i) => {
			if (i === this.state.focus[0] || i === this.state.focus[1]) {
				extraHeader.push(
					<th key={i} className="focus-header" colspan="2">
						{num2hexstr(n)}
					</th>
				);
			} else {
				extraHeader.push(
					<th key={i} className="value-header" colspan="2" onClick={() => this.shiftFocus(i)}>
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

				const fieldVal = this.parseField(n, field.bits);

				let highlight;
				if (otherVal) {
					const otherFieldVal = this.parseField(otherVal, field.bits);
					highlight = (fieldVal !== otherFieldVal);
				} 
				values.push(
					<td key={i+"d"} className={highlight ? "highlight-field" : ""} >
						{fieldVal}
					</td>
				);
				values.push(
					<td key={i+"h"} className={highlight ? "highlight-field" : ""} >
						0x{fieldVal.toString(16).toUpperCase()}
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
		return this.props.data.node.fields.length ? (
			<form className="reg-decode">
				<p>Decode comma seperated hex number:</p>
				<textarea name="decodeString" onChange={this.decode} value={this.state.decodeString || ""} />
				{ this.state.decodeError.length > 0 && <Warning>Invalid hex number:<ul>{this.state.decodeError}</ul></Warning>}
			</form>
		) : null;
	}
	
	render() {
		if (this.props.data.node) {
			return (
				<div className="reg-content">
					{this.getDescription()}
					{this.getRegMap()}
					{this.getFieldTable()}
					{this.getDecodeForm()}
				</div>
			);
		} else {
			return (
				<Redirect to={"/edit" + this.props.path} />
			);
		}
	}
}



export default RegisterViewer;
