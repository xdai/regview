import React, { useEffect, useState } from 'react';

import { Row, Typography, Breadcrumb, Button, Skeleton, Table, Tag, Tabs, Form, Input, Badge, Checkbox, AutoComplete, Collapse  } from 'antd';
import { EditOutlined, NumberOutlined, MenuOutlined, DeleteOutlined, PushpinTwoTone } from '@ant-design/icons';

import { BitViewer } from './BitGrid';
import { RegEditorModal } from './RegEditor';
import { parseNumberString } from './Utils';

import regDb from '../RegDb';

import './RegisterViewer.css';

const { Title, Paragraph } = Typography;

export default function RegView(props) {
	const {path} = props;
	const [data, setData] = useState();
	
	const fetchData = async (key) => {
		setData(await regDb.get(key));
	}

	// `fetchData` on `path` change
	useEffect(() => {fetchData(path)}, [path])

	// listen to DB change
	useEffect(() => {
		const handleUpdate = ({oldData, newData}) => {
			if (path === oldData.parent + oldData.name) {
				fetchData(newData.parent + newData.name)
			} 
		}
		regDb.subscribe(handleUpdate, "update");
		return () => {
			regDb.unsubscribe(handleUpdate, "update");
		}
	}, [])

	return data ? <Viewer data={data}/> : <Skeleton active paragraph={{ rows: 8 }}/>;
}

function Viewer({data}) {
	const [showRegModel, setShowRegModel] = useState(false);
	const fields = [...data.fields].reverse();

	const Path = () => {
		const path = data.parent + data.name;
		const segs = path.split("/").filter(e => e !== "");
		return (
			<Breadcrumb>{
				segs.map((seg, i) => (
					<Breadcrumb.Item key={i}>{seg}</Breadcrumb.Item>
				))
			}</Breadcrumb>
		);
	}
	
	const Description = () => (
		<article>
			<header>
				<Path/>
				<div className="title-container">
					<Title level={4}>
						{data.desc_short}
						<span className="address">Size: {data.size}</span>
						<span className="address">Offset: 0x{data.offset.toUpperCase()}</span>
					</Title>
					<Button icon={<EditOutlined />} onClick={()=>setShowRegModel(true)}>Edit</Button>
				</div>
			</header>
			<main>
				<Paragraph>{data.desc_long}</Paragraph>
			</main>
		</article>
	)
	
	return (
		<div className="reg-content">
			<Description/>
			<Row type="flex" justify="center" style={{marginBottom: 24, paddingBottom: 8}}>
				<AdaptiveBitViewer byteCount={data.size} fields={data.fields || []}/>
			</Row>
			<Tabs defaultActiveKey="1">
				<Tabs.TabPane tab="Fields" key="1">
					<FieldTable fields={fields}/>
				</Tabs.TabPane>
				<Tabs.TabPane tab="Encoder" key="2">
					<EncoderTable fields={fields}/>
				</Tabs.TabPane>
				<Tabs.TabPane tab="Decoder" key="3">
					<DecoderTable fields={fields}/>
				</Tabs.TabPane>
			</Tabs>
			
			
			{showRegModel && <RegEditorModal
				parent={data.parent}
				reg={data}
				title="Edit Register"
				hide={()=>setShowRegModel(false)}
			/>}
		</div>
	);
}

function AdaptiveBitViewer({byteCount, fields}) {
	// media query
	//  - 320: width of side bar
	//  - 600: width of BitViewer if we put 16bits per row
	//  - 1080: width of BitViewer if we put 32bits per row
	const cellWidth = 30;
	const mql16 = window.matchMedia(`(min-width: ${320 + 600}px)`);
	const mql32 = window.matchMedia(`(min-width: ${320 + 1080}px)`);
	
	const [can16, setCan16] = useState(mql16.matches);
	const [can32, setCan32] = useState(mql32.matches);

	const handleSizeChange16 = (e) => setCan16(e.matches);
	const handleSizeChange32 = (e) => setCan32(e.matches);

	useEffect(() => {
		mql16.addListener(handleSizeChange16);
		mql32.addListener(handleSizeChange32);
		return () => {
			mql16.removeListener(handleSizeChange16);
			mql32.removeListener(handleSizeChange32);
		}
	}, []);	

	const getBitsPerRow = () => {
		if (can32) return 32;
		if (can16) return 16;
		return 8;
	}	
	
	return (
		<BitViewer
			cellWidth={cellWidth} 
			bitsPerRow={getBitsPerRow()}
			byteCount={byteCount}
			fields={fields}
		/>
	)
}

function FieldTable({fields}) {
	const columns = [{
		key: "name",
		title: "Name",
		dataIndex: "name",
	}, {
		key: "bits",
		title: "Bits",
		dataIndex: "bits",
		width: 60,
		render: bits => `${bits[1]} : ${bits[0]}`,
	}, {
		key: "meaning",
		title: "Meaning",
		dataIndex: "meaning",
		render: (text, record) => (<>
			{text || "N/A"}
			<br/>
			{record.value && record.value.map(
				(v, i) => <ToggleTag key={i} name={v.name} value={parseNumberString(v.value)}/>
			)}
		</>)
	}];
	
	return (
		<Table 
			rowKey="name" 
			dataSource={fields} 
			columns={columns}
			pagination={false}
			size="small"
		/>
	);
}

function ConstantTag(props) {
	const {name, value, hex, ...rest} = props;
	return (
		<Tag color={hex ? "green" : "blue"} {...rest}>
			{name} &equiv; {hex ? "0x" + value.toString(16).toUpperCase() : value}
		</Tag>
	);
}

export function ToggleTag(props) {
	const {hex, className, ...rest} = props;
	const [isHex, setIsHex] = useState(hex);
	const tagProps = {
		...rest,
		hex: isHex,
		className: className ? className + " with-hover-pointer" : "with-hover-pointer",
		onClick: (e) => {
			props.onClick && props.onClick(e);
			setIsHex(!isHex);
		},
		style: {marginTop: 8},
	};
	return <ConstantTag {...tagProps}/>;
}

function DotTag(props) {
	const {dot, ...rest} = props;

	return (
		<Badge dot count={dot ? 1 : 0}>
			<ConstantTag {...rest}/>
		</Badge>
	);
}

function DotValue(props) {
	const {dot, hex, value} = props;

	return (
		<Badge dot count={dot ? 1 : 0}>
			<span style={{marginRight: "8px"}}>
				{hex ? "0x" + value.toString(16).toUpperCase() : value}
			</span>
		</Badge>
	)
}

function Code(props) {
	return <Typography.Text code>{props.children}</Typography.Text>
}

function EncoderTable({fields}) {
	const [form] = Form.useForm();
	const [source, setSource] = useState([]);
	const [sequence, setSequence] = useState(0);

	useEffect(() => {
		setSource([]);
	}, [fields])
	
	const handleAdd = () => {
		setSource([
			...source, 
			{
				key: sequence,
				idx: sequence,
			}
		]);
		setSequence(sequence + 1);
	}

	const handleRemove = (idx) => {
		setSource(source.filter(x => x.idx !== idx));
		const {[idx]:_, ...values} = form.getFieldsValue();
		form.setFieldsValue(values);
	}
	
	const DeleteBtn = ({index}) => (
		<Button type="link" icon={<DeleteOutlined />} onClick={()=>handleRemove(index)}/>
	);
	
	const columns = [{
		key: "value",
		title: <NumberOutlined />,
		onCell: (record) => ({
			fields: fields,
			index: record.idx,
			name: "value",
			form: form,
		})
	}, ...fields.map((field, i) => ({
		key: i,
		title: field.name,
		onCell: (record) => ({
			fields: fields,
			index: record.idx,
			name: "_"+field.name,
			form: form,
		})
	})), {
		key: "action",
		title: <MenuOutlined />,
		align: "center",
		render: (text, record) => <DeleteBtn index={record.idx}/>,
	}];

	return (<>
		<Button onClick={handleAdd}>Add Row</Button>
		<Form form={form}>
			<Table
				dataSource={source}
				columns={columns}
				components={{
					body: {
						cell: EncoderCell,
					},
				}}
				pagination={false}
				size="small"
				style={{marginTop: "16px"}}
			/>
			<Collapse bordered={false}>
				<Collapse.Panel header="About input format...">
					<p>Following number formats are accepted. They are case insensitive. Invalid inputs are treated as zero.</p>
					<ul>
						<li>Decimal: <Code>1024</Code></li>
						<li>Hex: <Code>0x87d</Code> or <Code>87dh</Code></li>
						<li>Octal: <Code>046</Code></li>
						<li>Binary: <Code>0b1101</Code></li>
					</ul>
				</Collapse.Panel>
			</Collapse>
		</Form>
	</>)
}

function EncoderCell(props) {
	const {fields, index, name, form, children, ...rest} = props;
	
	const updateRow = (values) => {
		const row = form.getFieldValue([index]);
		form.setFieldsValue({
			[index]: {row, ...values},
		});
	}
	
	const onValueChange = (e) => {
		const row = form.getFieldValue([index]);
		const value = parseNumberString("0x"+row["value"]) || 0;
		updateRow(fields.reduce((acc, cur) => {
			const shift = cur.bits[0];
			const mask = (1 << (cur.bits[1] - cur.bits[0] + 1)) - 1
			const k = "_" + cur.name;
			const v = (value >> shift) & mask;
			return {...acc, [k]: v};
		}, {}))
	}
	
	const onFieldChange = (e) => {
		const row = form.getFieldValue([index]);
		updateRow({
			value: fields.reduce((acc, cur) => {
				const shift = cur.bits[0];
				const mask = (1 << (cur.bits[1] - cur.bits[0] + 1)) - 1
				const k = "_" + cur.name;
				const v = ((parseNumberString(row[k] || "0") || 0) & mask) << shift;
				return acc | v;
			}, 0).toString(16).toUpperCase()
		});
	}

	const getOptions = (() => {
		if (!fields || name === "value") return [];
		const entry = fields.find(x => "_" + x.name === name);
		if (!entry || !entry.value) return [];
		return entry.value.map(({name, value}) => ({
			value: value,
			label: (
				<div
				  style={{
					display: 'flex',
					justifyContent: 'space-between',
				  }}
				>
					<span>{name}</span>
					<span>&equiv; {value}</span>
				</div>
			),
		}));
	});
	
	const content = form ? (
		<Form.Item name={[index, name]} style={{margin: 0,}}>
			<AutoComplete 
				options={getOptions()} 
				onChange={name === "value" ? onValueChange : onFieldChange}
			>
				<Input addonBefore={name === "value" ? "0x" : ""}/>
			</AutoComplete>
		</Form.Item>
	) : children;
	
	return <td {...rest}>{content}</td>;
}

function DecoderTable({fields}) {
	const [form] = Form.useForm();
	const [source, setSource] = useState([]);
	const [pin, setPin] = useState(0);
	const [otherIdx, setOtherIdx] = useState(NaN);
	const [showHex, setShowHex] = useState(fields.reduce((acc, cur) => {
		return {...acc, [cur.name]: false};
	}, {}));

	useEffect(() => {
		setSource([]);
		setPin(0);
		setOtherIdx(NaN);
	}, [fields])

	const constants = fields.reduce((acc, cur) => {
		return {...acc, [cur.name]: cur.value};
	}, {});

	const decodeValue = (value) => fields.reduce((acc, cur) => {
		const k = "_" + cur.name;
		const v = (value >> cur.bits[0]) & ((1 << (cur.bits[1] - cur.bits[0] + 1)) - 1);
		return {...acc, [k]: v};
	}, {});
	
	const handleAddValue = ({value}) => {
		form.resetFields();
		console.log(decodeValue(parseInt(value, 16)))
		setSource([
			...source, 
			{
				key: source.length,
				value: value,
				...decodeValue(parseInt(value, 16)),
			}
		]);
	}

	const handleRemoveValue = (e, idx) => {
		e.stopPropagation(); // so we don't trigger `onClick` of the row
		setPin(pin < idx ? pin : Math.max(0, pin - 1));
		setOtherIdx(NaN);
		setSource(
			source.filter((_,i)=>i!==idx).map((x, i) => ({
				...x,
				key: i,
			}))
		);
	}

	const AddValueForm = () => (
		<Form form={form} layout="inline" onFinish={handleAddValue}>
			<Form.Item 
				name="value" validateFirst 
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
				<Input addonBefore="0x" allowClear autoFocus />
			</Form.Item>
			<Form.Item>
				<Button type="primary" htmlType="submit">Add</Button>
			</Form.Item>
		</Form>
	);

	const PushPin = ({index}) => (
		index === pin && <PushpinTwoTone twoToneColor="#f50"/>
	);
	
	const DeleteBtn = ({index}) => (
		<Button type="link" icon={<DeleteOutlined />} onClick={(e)=>handleRemoveValue(e, index)}/>
	);

	const Field = ({index, name, value}) => {
		const key = "_" + name;
		const hex = showHex[name];
		const showBadge = (
			!isNaN(otherIdx) &&
			(index === pin || index === otherIdx) &&
			source[pin][key] !== source[otherIdx][key]
		);
		
		if (constants[name]) {
			// `==` as they are different types (string vs int)
			// eslint-disable-next-line
			const entry = constants[name].find(x => parseNumberString(x.value) == value);
			if (entry) {
				return (
					<DotTag 
						className="with-hover-pointer"
						dot={showBadge} hex={hex} 
						name={entry.name} 
						value={parseNumberString(entry.value)}
					/>
				)
			}
		}

		return <DotValue dot={showBadge} hex={hex} value={value}/>;
	}

	const columns = [{
		key: "pin",
		align: "center",
		width: 40,
		render: (text, record, index) => <PushPin index={index}/>,
	}, {
		key: "value",
		title: <NumberOutlined />,
		dataIndex: "value",
		render: (text) => "0x" + text.toUpperCase(),
	}, ...fields.map((field, i) => ({
		key: i,
		title: field.name,
		dataIndex: "_"+field.name,
		render: (text, record, index) => <Field index={index} name={field.name} value={text}/>
	})), {
		key: "action",
		title: <MenuOutlined />,
		align: "center",
		width: 40,
		render: (text, record, index) => <DeleteBtn index={index}/>,
	},];

	const summary = () => (
		<tr>
			<th colSpan={2} style={{padding: "8px"}}>Show Hex</th>
			{fields.map((field, i) => (<td key={i} style={{padding: "8px"}}>
				<Checkbox onChange={(e)=>{
					const v = {...showHex};
					v[field.name] = e.target.checked;
					setShowHex(v)
				}}/>
			</td>))}
			<td/>
		</tr>
	)

	return (<>
		<AddValueForm/>
		<Table
			dataSource={source}
			columns={columns}
			summary={summary}
			pagination={false}
			size="small"
			style={{marginTop: "16px"}}
			onRow={(record, rowIndex) => ({
				className: "with-hover-pointer",
				onClick: () => setPin(rowIndex),
				onMouseEnter: () => setOtherIdx(rowIndex),
				onMouseLeave: () => setOtherIdx(NaN),
			})}
		/>
	</>)
}