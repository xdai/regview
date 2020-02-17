import React, { useState, useEffect } from 'react';

// antd
import { Row, Col, Modal, Form, Input, Button, Popconfirm, Card, Divider, Typography } from 'antd';
import { DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

import schema from 'async-validator';

import regDb from '../RegDb';

import { BitEditor, idleFieldCtrl } from './BitGrid';
import GroupSelect from './GroupSelect';
import { ToggleTag } from './RegisterViewer';
import { isNumberString, parseNumberString } from './Utils';

import './RegEditor.css';

const MaxRegSize = 64; // in bytes

const EmptyNewField = {
	bits: [],
	name: "",
	meaning: "",
	value: [],
};

//------------------------------------------------------------
export default function RegEditor(props) {
	const {form, parent, activePath, reg, onFinish} = props;
	const initialValues = {
		...(reg || {
			parent: parent,
			size: "4",
			fields: [],
		}),
		fieldCtrl: idleFieldCtrl,
		newField: EmptyNewField,
	};

	// try to be smart: set `offset` and `size` based on current active register
	useEffect(() => {
		if (activePath) {
			regDb.get(activePath).then(value => {
				console.log(value);
				form.setFieldsValue({
					offset: (parseInt(value.offset, 16) + parseInt(value.size, 10)).toString(16).toUpperCase(),
					size: value.size,
				});
			})
		}
	}, [])

	const _commitField = async (idx) => {
		const isNewField = isNaN(idx);
		const fieldPath = isNewField ? ["newField"] : ["fields", idx];
		const value = await form.validateFields([fieldPath]);
		form.setFieldsValue({
			fieldCtrl: idleFieldCtrl, 
			...(isNewField && {
				fields: [...form.getFieldValue(["fields"]), value.newField].sort((a, b) => a.bits[0] - b.bits[0]),
				newField: EmptyNewField
			})
		});
	}

	const _commitForm = async (values) => {
		const {fieldCtrl, fields, newField, ...rest} = values;
		const data = {
			...rest,
			fields: fields || [],
		}
		
		if (fieldCtrl.mode === "adding") {
			data.fields.push(newField);
		}

		data.fields.sort((a, b) => a.bits[0] - b.bits[0]);

		// trancate the fields exsiding `maxBit`
		const maxBit = 8 * data.size - 1;
		data.fields = data.fields.filter(
			field => field.bits[0] <= maxBit
		).map(
			field => ({
				bits: [field.bits[0], Math.min(maxBit, field.bits[1])],
				name: field.name,
				meaning: field.meaning,
				value: field.value,
			})
		);
		
		if (reg) { // update
			await regDb.set(reg.parent + reg.name, data);
		} else { // add new
			await regDb.add(data);
		}
		
		onFinish();
	}

	return (
		<Form 
			form={form} 
			colon={false} layout="vertical"
			initialValues={initialValues}
			onFinish={_commitForm}
		>
			<Row gutter={24}>
				<Col span={6}>
					<Form.Item 
						label="Name"
						name="name"
						validateFirst
						rules={
							[{
								required: true,
								whitespace: true,
								message: "required"
							}, {
								pattern: /^[a-z][a-z0-9_ ]*$/i,
								message: "invalid",
							}]
						}
					>
						<Input allowClear/>
					</Form.Item>
				</Col>
				<Col span={10}>
					<Form.Item 
						label="Group"
						name="parent"
						validateFirst
						rules={
							[{
								required: true,
								whitespace: true,
								message: "required"
							}, {
								pattern: /^\/[/a-zA-Z0-9_ ]*$/,
								message: "invalid",
							}]
						}
					>
						<GroupSelect/>
					</Form.Item>
				</Col>
				<Col span={4}>
					<Form.Item 
						label="Offset"
						name="offset"
						validateFirst
						rules={
							[{
								required: true,
								whitespace: true,
								message: "required",
							}, {
								pattern: /^[0-9a-f]+$/i,
								message: "not a hex number",
							}]
						}
					>
						<Input addonBefore="0x" allowClear/>
					</Form.Item>
				</Col>
				<Col span={4}>
					<Form.Item 
						label="Size"
						name="size"
						validateFirst
						rules={
							[{
								required: true,
								whitespace: true,
								message: "required",
							}, {
								pattern: /^[0-9]+$/,
								message: "not an integer",
								
							}, {
								validator: (rule, value) => {
									if ((value - 1) & value) {
										return Promise.reject("not power of 2");
									} else if (value < 1 || value > MaxRegSize) {
										return Promise.reject(`not in range [1, ${MaxRegSize}]`);
									} else {
										return Promise.resolve();
									}
								},
							}]
						}
					>
						<Input allowClear/>
					</Form.Item>
				</Col>
			</Row>
			<Form.Item 
				label="Summary"
				name="desc_short"
				validateFirst
				rules={
					[{
						required: true,
						whitespace: true,
						message: "required"
					}]
				}
			>
				<Input allowClear/>
			</Form.Item>
			<Form.Item 
				label="Detail"
				name="desc_long"
			>
				<Input.TextArea rows={4} />
			</Form.Item>
			<FieldCtrl commitField={_commitField}/>
			<FieldList commitField={_commitField}/>
		</Form>
	);
}

function FieldCtrl(props) {
	const shouldUpdate = (prev, current) => { // when fields or size are changed
		if (prev.size !== current.size) return true;

		const [a, b] = [prev.fields, current.fields];

		if (a.length !== b.length) return true;
		for (let i = 0; i < a.length; i++) {
			if (a[i].bits[0] !== b[i].bits[0] ||
				a[i].bits[1] !== b[i].bits[1] ||
				a[i].name.localeCompare(b[i].name) !== 0 ||
				a[i].meaning.localeCompare(b[i].meaning) !== 0) {
				return true;
			}
		}
		
		return false;
	}

	const _render = (form) => {
		const byteCount = form.getFieldValue("size");
		return (
			<Row type="flex" justify="center" style={{marginBottom: 24, paddingBottom: 8}}>
				<Form.Item name="fieldCtrl">
					<BitEditor 
						cellWidth={30} bitsPerRow={16} byteCount={byteCount} 
						form={form} 
						commitField={props.commitField}
					/>
				</Form.Item>
			</Row>
		);
	}
	
	return (
		<Form.Item noStyle shouldUpdate={shouldUpdate}> 
			{_render} 
		</Form.Item>
	);
}

function FieldList(props) {
	const shouldUpdate = (prev, current) => {
		const [a, b] = [prev.fieldCtrl, current.fieldCtrl];

		if (a.mode !== b.mode || 
			a.activeKey !== b.activeKey ||
			a.selectedBits.length !== b.selectedBits.length) {
				return true;
		}

		for (let i = 0; i < a.selectedBits.length; i++) {
			if (a.selectedBits[i] !== b.selectedBits[i]) {
				return true;
			}
		}

		return false;
	}
	
	const _render = (form) => {
		const fields = form.getFieldValue("fields");
		const editors = fields.map((_, i) => (
			<FieldEditor key={i} form={form} fieldIdx={i} commitField={props.commitField}/>
		));
		return (
			<>
				{editors}
				<FieldEditor form={form} fieldIdx={NaN} commitField={props.commitField}/>
			</>
		);
	}
	
	return (
		<Form.Item noStyle shouldUpdate={shouldUpdate}>
			{_render}
		</Form.Item>
	)
}

function FieldEditor(props) {
	const {form, fieldIdx} = props;

	const fieldCtrl = form.getFieldValue(["fieldCtrl"]);
	const isNewField = isNaN(fieldIdx);
	const fieldPath = isNewField ? ["newField"] : ["fields", fieldIdx];
	const isActive = (()=>{
		if (fieldCtrl.mode === "editing" && fieldCtrl.activeKey === fieldIdx) return true;
		if (fieldCtrl.mode === "adding" && isNewField) return true;
		return false;
	})();

	// Don't bother to validate non-active fields.
	const fieldNameRule = isActive ? [{
		required: true,
		whitespace: true,
		message: "required"
	}, {
		pattern: /^[a-zA-Z][a-zA-Z0-9_ ]*$/,
		message: "invalid"
	}] : [];

	const handleConfirm = () => {
		props.commitField(fieldIdx);
	}

	const handleDelete = () => {
		form.setFieldsValue({
			fields: form.getFieldValue("fields").filter((_,i)=>i!==fieldIdx),
			fieldCtrl: idleFieldCtrl,
			newField: EmptyNewField,
		})
	}

	const ConfirmBtn = () =>
		<Button 
			type="link" 
			icon={<CheckOutlined />} 
			disabled={fieldCtrl.selectedBits.length !== 2}
			onClick={handleConfirm}
		/>;

	const DeleteBtn = () => isNewField ? (
		<Button type="link" icon={<CloseOutlined/>} onClick={handleDelete}/>
	) : (
		<Popconfirm 
			title={`Are you sure to delete this field?`} 
			okText="Yes" cancelText="No"
			onConfirm={handleDelete}
		>
			<Button type="link" icon={<DeleteOutlined/>} />
		</Popconfirm>
	);
	
	return (
		<Card 
			style={isActive ? {} : {display: "none"}}
			size="small"
			title={isNewField ? "Add Field" : "Edit Field"}
			extra={<><ConfirmBtn/><DeleteBtn/></>}
		>
			<Form.Item name={[...fieldPath, "bits", 0]} style={{display: "none"}}>
				<Input />
			</Form.Item>
			<Form.Item name={[...fieldPath, "bits", 1]} style={{display: "none"}}>
				<Input />
			</Form.Item>
			<Form.Item label="Field Name" name={[...fieldPath, "name"]} rules={fieldNameRule}>
				<Input allowClear />
			</Form.Item>
			<Form.Item label="Field Description" name={[...fieldPath, "meaning"]}>
				<Input.TextArea rows={1} />
			</Form.Item>
			
			<Divider orientation="left">Named Constants</Divider>
			
			<ConstantList form={form} fieldPath={fieldPath}/>
		</Card>
	)
}

function ConstantList(props) {
	const {form, fieldPath} = props;
	return (
		<Form.List name={[...fieldPath, "value"]}>{(entries, {add, remove}) => {
			const constants = form.getFieldValue([...fieldPath, "value"]);
			return (<>
				<Row>
					<ConstantInput add={add} constants={constants}/>
				</Row>
				<div>
				<Row className="constants-container">
					{entries.map((entry, i) => (
						<ToggleTag 
							key={entry.key}
							name={constants[entry.name].name}
							value={parseNumberString(constants[entry.name].value)}
							closable
							onClose={() => remove(entry.name)}
							style={{marginTop: 8}}
						/>
					))}
				</Row>
				</div>
			</>)
		}}</Form.List>
	)
}

function ConstantInput({add, constants}) {
	const [name, setName] = useState();
	const [value, setValue] = useState();
	const [error, setError] = useState();

	const validator = new schema({
		name: [{
			required: true,
			whitespace: true,
			message: "* Name is required",
		}, {
			pattern: /^[a-z][0-9a-z]*$/i,
			message: "* Invalid Name",
		}, {
			validator: (rule, s) => !constants || !constants.some(constant => constant.name === s.trim()),
			message: "* Name already in use",
		}],
		value: [{
			required: true,
			whitespace: true,
			message: "* Value is required",
		},{
			validator: (rule, s) => isNumberString(s),
			message: "* Value is not a valid decimal, hex, octal or binary number",
		}]
	})
	
	const handleAdd = () => {
		validator.validate(
			{name, value}, 
			{first: true, firstFields: true}
		).then(() => {
			// name is trim'ed, but value is kept as original radix.
			add({name: name.trim(), value});
			setName();
			setValue();
			setError();
		}).catch(({errors, fields}) => {
			setError(errors[0].message)
		})
	}
	
	return (
		<Input.Group compact style={{marginBottom: 16}}>
			<Input placeholder="Name" id="constant-left" onInput={e=>setName(e.target.value)} value={name}/>
			<Input placeholder="&equiv;" disabled id="constant-middle"/>
			<Input placeholder="Value" id="constant-right" onInput={e=>setValue(e.target.value)} value={value}/>
			<Button type="primary" onClick={handleAdd}>Add</Button>
			<Typography.Text type="danger" className="constant-error">{error}</Typography.Text>
		</Input.Group>
	)
}

export function RegEditorModal(props) {
	const {parent, activePath, reg, title, hide} = props;
	const [form] = Form.useForm();
	
	const modalProps = {
		title: title,
		width: 960,
		// The visibility is controlled by mount / unmount of the component instead 
		// of the `visible` props, so we get a new `form` for each register. If we 
		// re-use the `form`, the `initialValue` of the `form` will not be set
		// correctly. This is likely a bug of antd.
		visible: true,
		maskClosable: false,
		onOk: form.submit,
		onCancel: hide,
	};

	return (
		<Modal {...modalProps}>
			<RegEditor form={form} parent={parent} activePath={activePath} reg={reg} onFinish={hide}/>
		</Modal>
	);
};