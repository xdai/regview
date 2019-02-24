import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { RegContext } from '../RegDb';
import { RegContainer, Field } from './RegContainer';
import { getCoordinate, isInRange } from './Utils';
import { Warning } from './Form';

import './RegEditor.css';

//------------------------------------------------------------
class RegEditor extends Component {
	static contextType = RegContext;

	constructor(props) {
		super(props);

		if (this.props.data && this.props.data.node) {
			this.state = {
				name: this.props.data.node.name,
				parent: this.props.data.node.parent,
				offset: this.props.data.node.offset,
				size: this.props.data.node.size,
				desc_short: this.props.data.node.desc_short,
				desc_long: this.props.data.node.desc_long,
				fields: this.props.data.node.fields,
				
				mode: 'edit',
				done: false,
				error: undefined
			};
		} else {
			this.state = {
				name: '',
				parent: this.props.path,
				offset: undefined,
				size: 4,
				desc_short: undefined,
				desc_long: undefined,
				fields: [],
				
				mode: 'new',
				done: false,
				error: undefined
			};
		}
	}

	onSizeChange = (e) => {
		const target = e.target;
		const value  = target.value;
		if (parseInt(value, 10) > 64) {
			this.setState({
				isInputValid: false,
				showWarn: true,
				errorMessage: "Register cannot be more than 64 bytes long"
			})
		} else {
			this.setState({
				showWarn: false,
				size: parseInt(value, 10) * 8
			})
		}
	}

	onInputChange = (e) => {
		const target = e.target;
		const name = target.name;
		const value = target.value;

		this.updateRegister(name, value);
	}

	updateRegister = (property, value) => {
		this.setState({
			[property]: value,
			error: undefined
		});
	}

	addField = (field) => {
		this.setState((state) => ({
			fields: [...state.fields, field].sort((a,b) => a.bits[0] - b.bits[0])
		}));
	}

	updateField = (pos, field) => {
		this.setState((state) => {
			let newFields = state.fields.slice(0);
			const idx = newFields.findIndex((e) => e.bits[0] === pos);
			newFields[idx] = field;

			return ({
				fields: newFields.sort((a,b) => a.bits[0] - b.bits[0])
			});
		});
	}

	deleteField = (pos) => {
		this.setState((state) => {
			let newFields = state.fields.slice(0);
			const idx = newFields.findIndex((e) => e.bits[0] === pos);
			newFields.splice(idx, 1);

			return ({
				fields: newFields
			});
		});
	}

	commitChange = () => {
		const db = this.context;
		const data = {
			name: this.state.name,
			parent: this.state.parent,
			offset: this.state.offset,
			width: this.state.size,
			desc_short: this.state.desc_short,
			desc_long: this.state.desc_long,
			fields: this.state.fields
		};
		
		let promise;
		if (this.state.mode === 'edit') { // update
			promise = db.set(this.props.path, data);
		} else { // add
			promise = db.add(data);
		}

		promise.then(() => {
			this.setState({
				done: true,
				error: undefined
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
				<Redirect to={"/view" + this.state.parent + this.state.name}/>
			);
		}
		return (
			<Fragment>
				<div className="reg-editor">
					<label name="name-label">Name:</label>
					<input name="name" type="text" required onChange={this.onInputChange} value={this.state.name || ""}/>
					
					<label name="parent-label">Group:</label>
					{ 
						this.state.mode === 'new' ? 
						<label>{this.state.parent}</label> :
						<input name="parent" type="text" required onChange={this.onInputChange} value={this.state.parent || ""}/>
					}

					<label name="offset-label">Offset:</label>
					<input name="offset" type="text" placeholder="in hex" required onChange={this.onInputChange} value={this.state.offset || ""}/>
					
					<label name="size-label">Size:</label>
					<input name="size" type="number" min={1} max={64} placeholder="in bytes" required onChange={this.onInputChange} value={this.state.size}/>
					
					<label name="desc-short-label">Summary:</label>
					<input name="desc_short" required onChange={this.onInputChange} value={this.state.desc_short || ""}/>
					
					<label name="desc-long-label">Detail:</label>
					<textarea name="desc_long" placeholder="optional" onChange={this.onInputChange} value={this.state.desc_long || ""}/>
					
					<FieldEditor
						size={this.state.size} 
						width={32}
						fields={this.state.fields}
						addField={this.addField}
						updateField={this.updateField}
						deleteField={this.deleteField}
					/>

					<button 
						name="field-add-btn" 
						onClick={this.commitChange} 
						disabled={!(this.state.offset && this.state.desc_short)}>
						Done
					</button>
				</div>
				{this.state.error && <Warning>{this.state.error}</Warning>}
			</Fragment>
		);
	}
}

/*
 * Props:
 *   - size: total bits of this register
 *   - width: bit count per line
 */
 class FieldEditor extends Component {
 	constructor(props) {
 		super(props);
 		this.state = {
			mode: "init",
			focus: undefined,
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined
 		}
 	}

 	// Check if field [begin,end] can be added. I.e. no intersection with other fields
 	canAddField = (begin, end) => {
		let isIntersect = (ra, rb) => {
			return isInRange(ra[0], rb) || isInRange(ra[1], rb) ||
				isInRange(rb[0], ra) || isInRange(rb[1], ra);
		};
		const fields = this.props.fields;
		
		for (let i = 0; i < fields.length; i++) {
			if (this.isUpdatingField() && this.state.focus === fields[i].bits[0]) {
				continue;
			}
			if (isIntersect([begin, end], fields[i].bits)) {
				return false;
			}
		}
		
		return true;
 	}

 	// This is called when user clicks on the bits. It drives a simple state machine.
	setFieldRange = (pos) => {
		switch (this.state.mode) {
		case "init":
			this.setState({
				mode: "open_candidate",
				begin: pos,
				end: pos,
			});
			break;
		case "open_candidate":
			if (this.canAddField(this.state.begin, pos)) {
				this.setState({
					mode: "close_candidate",
					end: pos,
				});
			}
			break;
		case "close_candidate":
			this.setState({
				mode: "open_candidate",
				begin: pos,
				end: pos
			});
			break;
		case "open_field":
			if (this.canAddField(this.state.begin, pos)) {
				this.setState({
					mode: "close_field",
					end: pos,
				});
			}
			break;
		case "close_field":
			this.setState({
				mode: "open_field",
				begin: pos,
				end: pos
			});
			break;
		default:
			break;
		}
	}

	// This is called when the field is open (i.e. in state "open_candidate") and user hovers on the bits.
	trySetFieldRange = (pos) => {
		switch (this.state.mode) {
		case "open_candidate":
		case "open_field":
			if (this.canAddField(this.state.begin, pos)) {
				this.setState({
					end: pos
				});
			}
			break;
		default:
			break;
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

 	onAddField = (e) => {
 		// let index = this.state.fields.findIndex((item) => item.bits[0] > field.bits[0]);
 		// console.log("Index = " + index);
 		// this.state.fields.splice(index === -1 ? 0 : index, 0, field);
 		this.props.addField({
 			bits: [this.state.begin, this.state.end].sort((a,b) => a - b),
 			name: this.state.field_name,
 			desc_long: this.state.field_desc
 		});

 		this.setState({
			mode: "init",
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined
		});
 	}

 	onStartUpdating = (pos) => {
		const idx = this.props.fields.findIndex((e) => e.bits[0] === pos);
		const field = this.props.fields[idx];

 		this.setState({
 			mode: "close_field",
 			focus: field.bits[0],
 			begin: field.bits[0],
 			end: field.bits[1],
 			field_name: field.name,
 			field_desc: field.meaning
 		});
 	}

 	onEndUpdating = () => {
 		this.props.updateField(this.state.focus, {
 			bits: [this.state.begin, this.state.end].sort((a,b) => a - b),
 			name: this.state.field_name,
 			meaning: this.state.field_desc
 		});

 		this.setState({
			mode: "init",
			focus: undefined,
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined
		});
 	}

 	onCancelEditing = () => {
 		this.setState({
			mode: "init",
			focus: undefined,
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined
		});
 	}

 	onDeleteField = () => {
 		this.props.deleteField(this.state.focus);
 		this.setState({
			mode: "init",
			focus: undefined,
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined
		});
 	}

 	forEachField = (action) => {
		this.props.fields.forEach((field) => {
			action(field);
		});
	}

	forEachBit = (action) => {
		let pos = 0;
		
		this.forEachField((field) => {
			const low  = field.bits[0];
			const high = field.bits[1];

			for (; pos < low; pos++) {
				action(pos);
			}

			pos = high + 1;
		});

		for(; pos < this.props.size * 8; pos++) {
			action(pos);
		}
	}

	isAddingField = () => {
		return this.state.mode === "open_candidate" || this.state.mode === "close_candidate";
	}

	isUpdatingField = () => {
		return this.state.mode === "open_field" || this.state.mode === "close_field";
	}

 	render() {
		let children = [];

		this.forEachField((field) => {
			if (this.isUpdatingField() && field.bits[0] === this.state.focus) {
				for (let pos = field.bits[0]; pos <= field.bits[1]; pos++) {
					children.push(
						<Bit 
							key={pos} 
							pos={pos} 
							value={0} 
							width={this.props.width}
							highlight={this.state.mode !== "init" && isInRange(pos, [this.state.begin, this.state.end])}
							setFieldRange={this.setFieldRange}
							trySetFieldRange={this.trySetFieldRange}
						/>
					);
				}
			} else {
				children.push(
					<Field key={field.bits[0]} 
						{...field} 
						width={this.props.width}
						onStartUpdating={this.onStartUpdating}
					/>
				);
			}
		});

		this.forEachBit((pos) => {
			children.push(
				<Bit 
					key={pos} 
					pos={pos} 
					value={0} 
					width={this.props.width}
					highlight={this.state.mode !== "init" && isInRange(pos, [this.state.begin, this.state.end])}
					setFieldRange={this.setFieldRange}
					trySetFieldRange={this.trySetFieldRange}
				/>
			);
		});

		let form;
		let submitBtnText;
		let submitBtnAction;
		let submitBtnDisabled;

		if (this.isAddingField()) {
			submitBtnText = "Add Field";
			submitBtnAction = this.onAddField;
			submitBtnDisabled = (!this.state.field_name || this.state.mode !== "close_candidate");
		} else if (this.isUpdatingField()) {
			submitBtnText = "Update Field";
			submitBtnAction = this.onEndUpdating;
			submitBtnDisabled = (!this.state.field_name || this.state.mode !== "close_field");
		}

		let submitBtn = 
			<button 
				name="field-submit-btn" 
				onClick={submitBtnAction} 
				disabled={submitBtnDisabled}>
				{submitBtnText}
			</button>;

		let cancelBtn = 
			<button 
				name="field-cancel-btn" 
				onClick={this.onCancelEditing}>
				Cancel
			</button>;

		let deleteBtn = 
			<button 
				name="field-delete-btn" 
				onClick={this.onDeleteField}>
				Delete
			</button>

		if (this.isAddingField() || this.isUpdatingField()) {
			form = 
				<div className="field-form">
					<label name="field-name-label">Field Name:</label>
					<input name="field_name" type="text" required onChange={this.onInputChange} value={this.state.field_name || ""}/>
					
					<label name="field-desc-label">Field Description:</label>
					<textarea name="field_desc" onChange={this.onInputChange} value={this.state.field_desc || ""}/>

					{submitBtn}
					{deleteBtn}
					{cancelBtn}
				</div>;
		}

 		return (
 			<div className="field-editor">
	 			<RegContainer width={this.props.width} size={this.props.size}>
	 				{children}
	 			</RegContainer>

	 			{form}
			</div>
 		);
 	}
 }

/*
 * Props:
 *   - pos: bit offset (base 0)
 *   - width: bit count per line
 *   - value: 0 or 1
 */
 class Bit extends Component {
 	onClick = (e) => {
 		this.props.setFieldRange(this.props.pos);
 	}

 	onHover = (e) => {
 		this.props.trySetFieldRange(this.props.pos);
 	}
 	
 	render() {
 		const [row, col] = getCoordinate(this.props.pos, this.props.width);
 		const bitStyle = {
 			gridRow: row,
 			gridColumnStart: col,
 			gridColumnEnd: col,
 		};
 		let className = 'bit';
 		if (this.props.highlight) {
 			className += ' active-in-field'
 		}
 		
 		return (
 			<div className={className} style={bitStyle} onClick={this.onClick} onMouseOver={this.onHover}>
 				{this.props.pos}
 			</div>
 		);
 	}
 }

 export default RegEditor;
