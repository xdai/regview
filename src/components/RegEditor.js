import React, { Component, Fragment } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';
import { RegContainer, Field } from './RegContainer';
import { getCoordinate, isInRange } from './Utils';
import { Warning, Keyword } from './Form';

import './RegEditor.css';

const MaxRegSize = 64; // in bytes

//------------------------------------------------------------
class RegEditor extends Component {
	constructor(props) {
		super(props);

		if (this.props.op === '/edit') {
			const node = this.props.data.node;
			this.state = {
				name: node.name,
				parent: node.parent,
				offset: node.offset,
				size: node.size,
				desc_short: node.desc_short,
				desc_long: node.desc_long,
				fields: node.fields,
				
				isEditingField: false,
				done: false,
				error: undefined
			};
		} else {
			this.state = {
				name: '',
				parent: this.props.path,
				offset: 0,
				size: 4,
				desc_short: '',
				desc_long: '',
				fields: [],
				
				isEditingField: false,
				done: false,
				error: undefined
			};
		}
	}

	validate = (key, val) => {
		const validator = {
			'name': value => {
				if (value.match(/^[a-zA-Z][a-zA-Z0-9_ ]*$/)) {
					return [true];
				} else {
					return [false, <li key="name">Register name: <Keyword>{value}</Keyword> is an invalid name</li>];
				}
			},
			'parent': value => {
				if (value.match(/^\/[/a-zA-Z0-9_ ]*$/)) {
					return [true];
				} else {
					return [false, <li key="parent">Register group: <Keyword>{value}</Keyword> is an invalid parent name</li>];
				}
			},
			'offset': value => {
				if (value.match(/^[0-9a-f]+$/i)) {
					return [true];
				} else {
					return [false, <li key="offset">Register offset: <Keyword>{value}</Keyword> is an invalid hex number</li>]
				}
			},
			'size': value => {
				if (value.match(/^[1-9][0-9]*/) && parseInt(value, 10) <= MaxRegSize) {
					return [true];
				} else if (value.match(/^\s*$/)) {
					return [false, <li key="size">Register size: it cannot be empty.</li>]
				} else {
					return [false, <li key="size">Register size: <Keyword>{value}</Keyword> is an invalid size. It should be in range <Keyword>[1, {MaxRegSize}]</Keyword>.</li>]
				}
			},
			'desc_short': value => {
				if (value.match(/\S/)) {
					return [true];
				} else {
					return [false, <li key="desc_short">Register summary cannot be empty</li>]
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

	canSubmit = () => {
		return !this.state.error;
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

	onEditingField = (isEditing) => {
		console.log(`Editing: ${isEditing ? 'true' : 'false'}`)
		this.setState({
			isEditingField: isEditing
		});
	}

	commitChange = () => {
		const data = {
			name: this.state.name,
			parent: this.state.parent,
			offset: this.state.offset,
			size: this.state.size,
			desc_short: this.state.desc_short,
			desc_long: this.state.desc_long,
			fields: this.state.fields
		};
		
		let promise;
		if (this.props.op === '/edit') { // update
			promise = regDb.set(this.props.path, data);
		} else { // add
			promise = regDb.add(data);
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

		const submitBtn = 
			<button 
				name="field-add-btn" 
				onClick={this.commitChange} 
				disabled={!this.canSubmit()}>
				Done
			</button>;
		
		return (
			<Fragment>
				<div className="reg-editor">
					<label name="name-label">Name:</label>
					<input name="name" type="text" required onChange={this.onInputChange} value={this.state.name || ""}/>
					
					<label name="parent-label">Group:</label>
					{ 
						this.props.op === '/edit' ? 
						<input name="parent" type="text" required onChange={this.onInputChange} value={this.state.parent || ""}/> :
						<label>{this.state.parent}</label>
					}

					<label name="offset-label">Offset:</label>
					<input name="offset" type="text" placeholder="in hex" required onChange={this.onInputChange} value={this.state.offset || ""}/>
					
					<label name="size-label">Size:</label>
					<input name="size" type="number" min={1} max={MaxRegSize} placeholder="in bytes" required onChange={this.onInputChange} value={this.state.size}/>
					
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
						onEditing={this.onEditingField}
					/>

					{ !this.state.isEditingField && submitBtn }
				</div>
				<Warning>{this.state.error}</Warning>
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
			field_desc: undefined,

			error: undefined
 		}
	}

	reset = () => {
		this.setState({
			mode: "init",
			focus: undefined,
			begin: undefined,
			end: undefined,
			field_name: undefined,
			field_desc: undefined,

			error: undefined
		});

		this.props.onEditing(false);
	}

	validate = (key, val) => {
		const validator = {
			'field_name': value => {
				if (value.match(/^[a-zA-Z][a-zA-Z0-9_ ]*$/)) {
					return [true];
				} else {
					return [false, <li key="field_name"><Keyword>{value}</Keyword> is an invalid field name</li>];
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

	canSubmit = () => {
		return this.state.field_name && !this.state.error && (this.state.mode === 'close_field' || this.state.mode === 'close_candidate');
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

 	// when we click on a bit
	setFieldRange = (pos) => {
		switch (this.state.mode) {
		case "init":
			this.setState({
				mode: "open_candidate",
				begin: pos,
				end: pos,
			});
			this.props.onEditing(true);
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

	// when the field is open and we hover on the bit
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
	
	// when we click on a field
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
		 
		this.props.onEditing(true);
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

	// when "add" button is cicked
 	onAddField = (e) => {
 		this.props.addField({
 			bits: [this.state.begin, this.state.end].sort((a,b) => a - b),
 			name: this.state.field_name,
 			meaning: this.state.field_desc
 		});

 		this.reset();
 	}
	 
	// when "update" button is clicked
 	onEndUpdating = () => {
 		this.props.updateField(this.state.focus, {
 			bits: [this.state.begin, this.state.end].sort((a,b) => a - b),
 			name: this.state.field_name,
 			meaning: this.state.field_desc
 		});

 		this.reset();
 	}

	// when "cancel" button is clicked
 	onCancelEditing = () => {
 		this.reset();
 	}

	// when "delete" button is clicked
 	onDeleteField = () => {
 		this.props.deleteField(this.state.focus);
		 
		 this.reset();
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

		for(; pos < Math.min(MaxRegSize, this.props.size) * 8; pos++) {
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

		const highlight = (pos) => {
			if (isInRange(pos, [this.state.begin, this.state.end])) {
				if (this.isAddingField()) {
					return 'adding';
				} else if (this.isUpdatingField()) {
					return 'updating';
				}
			}

			return 'none'
		}

		this.forEachField((field) => {
			if (this.isUpdatingField() && field.bits[0] === this.state.focus) {
				for (let pos = field.bits[0]; pos <= field.bits[1]; pos++) {
					children.push(
						<Bit 
							key={pos} 
							pos={pos} 
							value={0} 
							width={this.props.width}
							highlight={highlight(pos)}
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
					highlight={highlight(pos)}
					setFieldRange={this.setFieldRange}
					trySetFieldRange={this.trySetFieldRange}
				/>
			);
		});

		let form;
		let submitBtnText;
		let submitBtnAction;

		if (this.isAddingField()) {
			submitBtnText = "Add Field";
			submitBtnAction = this.onAddField;
		} else if (this.isUpdatingField()) {
			submitBtnText = "Update Field";
			submitBtnAction = this.onEndUpdating;
		}

		const submitBtn = 
			<button 
				name="field-submit-btn" 
				onClick={submitBtnAction} 
				disabled={!this.canSubmit()}>
				{submitBtnText}
			</button>;
		
		const cancelBtn = 
			<button 
				name="field-cancel-btn" 
				onClick={this.onCancelEditing}>
				Cancel
			</button>;
		
		const deleteBtn = this.isUpdatingField() ?
			<button 
				name="field-delete-btn" 
				onClick={this.onDeleteField}>
				Delete
			</button> : null;


		if (this.isAddingField() || this.isUpdatingField()) {
			form = 
				<div className="field-form">
					<label name="field-name-label">Field Name:</label>
					<input name="field_name" type="text" required onChange={this.onInputChange} value={this.state.field_name || ""}/>
					
					<label name="field-desc-label">Field Description:</label>
					<textarea name="field_desc" onChange={this.onInputChange} value={this.state.field_desc || ""}/>

					<div className="field-btns">
						{submitBtn}
						{cancelBtn}
						{deleteBtn}
					</div>
				</div>;
		}

 		return (
 			<div className="field-editor">
	 			<RegContainer width={this.props.width} size={Math.min(MaxRegSize, this.props.size)}>
	 				{children}
	 			</RegContainer>

	 			{form}

				<Warning>{this.state.error}</Warning>
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
		 
 		return (
 			<div className={`bit active-${this.props.highlight}`} style={bitStyle} onClick={this.onClick} onMouseOver={this.onHover}>
 				{this.props.pos}
 			</div>
 		);
 	}
 }

 export default RegEditor;
