import React, { useState } from 'react';

import { Steps, Radio, Row, Col, Button, message, Spin, Alert, Form, Input } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

import regDb from '../RegDb';

import './DataPicker.css'

const { Step } = Steps;

//------------------------------------------------------------

function DataPicker(props) {
	const [current,     setCurrent]   = useState(0);
	const [source,      setSource]    = useState("fresh");
	const [json,        setJson]      = useState(null);
	const [isCommiting, setCommiting] = useState(false);

	const [form] = Form.useForm();

	const handleImport = () => {
		setCommiting(true);
		
		regDb.import(json).then(() => {
			setCurrent(2);
			setCommiting(false);
		}).catch(() => {
			message.error("Failed to import this JSON file");
			setCommiting(false);
		});
	}

	const handleFresh = () => {
		setCommiting(true);
		form.validateFields().then(value => {
			regDb.reset().then(() => {
				regDb.add({
					parent: "/",
					name: value.name + "/",
					offset: value.offset,
				})
			})
		}).then(() => {
			setCurrent(2);
			setCommiting(false);
		}).catch(() => {
			setCommiting(false);
		})
	}

	const getContent = () => {
		switch (current) {
		case 0:
			return <SourceSelect setSource={setSource} value={source}/>;
		case 1:
			if (source === "import") {
				return <JsonReader setJson={setJson}/>;
			} else if (source === "fresh") {
				return <GroupAdder form={form}/>;
			} else {
				return null;
			}
		case 2:
			return (
				<div style={{textAlign: "center", width: "100%"}}>
					<h3>Great, you are ready to go!</h3>
					<Button type="primary" onClick={props.onFinish}>Proceed</Button>
				</div>
			);
		default:
			return null;
		}
	}

	const getPrevBtn = () => {
		return current === 1 ? <Button onClick={()=>setCurrent(0)}>Back</Button> : null;
	}

	const getNextBtn = () => {
		switch (current) {
		case 0:
			return <Button onClick={()=>setCurrent(1)}>Next</Button>;
		
		case 1:
			if (source === "import") {
				return <Button onClick={handleImport} loading={isCommiting} disabled={!json}>Next</Button>;
			} else if (source === "fresh") {
				return <Button onClick={handleFresh} loading={isCommiting}>Next</Button>
			} else {
				return null;
			}
		
		default:
			return null;
		}
	}

	const getSourceDescription = () => {
		if (current === 0) {
			return "Provide data";
		} else {
			if (source === "fresh") {
				return "Create a group";
			} else if (source === "import") {
				return "Import from JSON";
			} else {
				return "Provide data";
			}
		}
	}

	const steps = [{
		title: "Source",
		description: "Choose data source"
	}, {
		title: "Data",
		description: getSourceDescription()
	}, {
		title: "Done",
		description: "All set"
	}]

	return (
		<div className="data-source-container">
			<div className="data-source">
				<Row >
					<Steps current={current}>
						{
							steps.map(el => (
								<Step {...el} key={el.title}></Step>
							))
						}
					</Steps>
				</Row>
				<Row style={{padding: "24px 0"}}>
					{getContent()}
				</Row>
				<Row justify="space-between">
					<Col>
						{getPrevBtn()}
					</Col>
					<Col>
						{getNextBtn()}
					</Col>
				</Row>
			</div>
		</div>
	)
}

function SourceSelect(props) {
	const radioStyle = {
		display: 'block',
		height: '30px',
		lineHeight: '30px',
	};
	const onChange = (e) => {
		props.setSource(e.target.value);
	};
	return (
		<Form>
			<p>
				All the data will be stored in your browser's &nbsp;
				<a 
					href="https://developers.google.com/web/ilt/pwa/working-with-indexeddb" 
					target="_blank" 
					rel="noopener noreferrer"
				>
					IndexedDB
				</a>. 
				It appears that your database is empty. Please choose a way to create one.
			</p>
			<Radio.Group onChange={onChange} value={props.value} style={{paddingLeft: "16px"}}>
				<Radio style={radioStyle} value="fresh">
					Start fresh by hand 
				</Radio>
				<Radio style={radioStyle} value="import">
					Import from JSON file
				</Radio>
			</Radio.Group>
		</Form>
	)
}

function JsonReader(props) {
	const [isLoading, setLoading] = useState(false);
	const [filename, setFilename] = useState(null);
	
	// dragEnter / dragLeave triggers on child elementes as well...
	const [dragCounter, setDragCounter] = useState(0);
	
	const readData = (file) => {
		const reader = new FileReader();
		reader.onload = () => {
			props.setJson(reader.result)
			setFilename(file.name)
			setLoading(false);
		};
		setLoading(true);
		reader.readAsText(file);
	};
	
	const handleUpload = (e) => {
		readData(e.target.files[0]);
		e.target.value = null; // so can load same file after unload
	};
	
	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		const data = e.dataTransfer;
		if (data.files.length) {
			readData(data.files[0]);
		}
	};
	
	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};
	
	const handleDragEnter = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(dragCounter + 1)
	};
	
	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(dragCounter - 1);
	};
	
	const handleUnload = () => {
		props.setJson(null)
		setFilename(null)
	}
	
	const fileList = filename ? (
		<Alert
			message={filename}
			closable
			onClose={handleUnload}
			style={{marginTop: "16px"}}
		/>
	) : null;

	const dragOverStyle = dragCounter ? {border: "1px dashed #40a9ff"} : null;
	
	return (
		<div className="data-picker-container" >
			<label 
				className="data-picker"
				style={dragOverStyle}
				onDrop={handleDrop} 
				onDragOver={handleDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
			>
				<input type="file" accept="application/json" onChange={handleUpload}/>
				<Spin spinning={isLoading}>
					<div>
						<span className="data-picker-icon"><InboxOutlined /></span>
						<p>Click or drag JSON file to this area to upload</p>
					</div>
				</Spin>
			</label>
			{ fileList }
		</div>
	);
}

function GroupAdder(props) {
	const layout = {
		labelCol: {
		  span: 5,
		},
		wrapperCol: {
		  span: 19,
		},
	};
	
	return (
		<Form
			style={{width: "100%"}}
			{...layout} 
			form={props.form}
		>
			<p>Please create a group to host all your data. You can edit or add more groups later.</p>
			<Form.Item
				label="Name"
				name="name"
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
				<Input />
			</Form.Item>
			<Form.Item
				label="Base Address"
				name="offset"
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
				<Input addonBefore="0x"/>
			</Form.Item>
		</Form>
	)
}

export default DataPicker;
