import React from 'react';

// antd
import { Modal, Form, Input, message, Typography } from 'antd';

import regDb, { KeyExistError } from '../RegDb';
import GroupSelect from './GroupSelect';

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
export default function GroupEditor(props) {
	const {form, parent, grp, onFinish} = props;
	const initialValues = grp ? {
		...grp,
		name: grp.name.slice(0, -1),
	} : { parent };

	const _commitForm = async (value) => {
		const data = {
			name: value.name + "/",
			parent: value.parent,
			offset: value.offset,
		}
		try {
			if (grp) { // update
				await regDb.set(grp.parent + grp.name, data);
			} else { // create new
				await regDb.add(data);
			}
			onFinish();
		} catch (e) {
			if (e instanceof KeyExistError) {
				message.error(
					<span>
						Entry with key <Typography.Text code>{e.message}</Typography.Text> is already exist
					</span>
				)
			} else {
				message.error(`${e.name}: ${e.message}`);
			}
		}
	}
	
	const formProps = {
		labelCol:   { span: 4  },
		wrapperCol: { span: 20 },
		form, 
		initialValues,
		onFinish: _commitForm,
	};

	return (
		<Form {...formProps}>
			<Form.Item
				label="Parent"
				name="parent"
				rules={[
					{
						required: true,
						message: "required"
					}
				]}
			>
				<GroupSelect except={grp ? grp.parent + grp.name : null}/>
			</Form.Item>
			<Form.Item
				label="Name"
				name="name"
				validateFirst
				rules={[
					{
						required: true,
						whitespace: true,
						message: "required"
					}, {
						pattern: /^[a-zA-Z][a-zA-Z0-9_ ]*$/,
						message: "invalid",
					}
				]}
			>
				<Input allowClear/>
			</Form.Item>
			<Form.Item
				label="Offset"
				name="offset"
				validateFirst
				rules={[
					{
						required: true,
						whitespace: true,
						message: "required",
					}, {
						pattern: /^[0-9a-f]+$/i,
						message: "not a hex number",
					}
				]}
			>
				<Input addonBefore="0x" allowClear/>
			</Form.Item>
		</Form>
	)
}
export function GroupEditorModal(props) {
	const {parent, grp, title, hide} = props;
	const [form] = Form.useForm();

	const modalProps = {
		title: title,
		width: 480,
		visible: true, // see `RegEditorModal`
		maskClosable: false,
		onOk: form.submit,
		onCancel: hide,
	}
	
	return (
		<Modal {...modalProps}>
			<GroupEditor form={form} parent={parent} grp={grp} onFinish={hide}/>
		</Modal>
	);
}