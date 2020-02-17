import React, { useState, useEffect } from 'react';

import RegView from './components/RegisterViewer';
import { GroupEditorModal } from './components/GroupEditor';
import { RegEditorModal } from './components/RegEditor';
import { ExporterModal } from './components/Exporter';

import { Layout, Row, Col, Button, Skeleton, message, Typography, Empty } from 'antd';
import { FolderAddOutlined, FileAddOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';

import RegList from './components/RegList';
import DataPicker from './components/DataPicker';

import regDb, { KeyExistError } from './RegDb';

import './App.css'

const {Header, Sider, Content } = Layout;

//------------------------------------------------------------

export default function App() {
	const [stage, setStage] = useState("init");

	useEffect(() => {
		regDb.count().then(n => setStage(n > 1 ? "loaded" : "create"));
	}, []);

	useEffect(() => {
		const handleDelete = () => {
			regDb.count().then(n => setStage(n > 1 ? "loaded" : "create"))
		}
		regDb.subscribe(handleDelete, "delete");
		return () => regDb.unsubscribe(handleDelete, "delete");
	}, [])
	
	switch (stage) {
	case "init":
		return <Skeleton active/>;

	case "loaded":
		return <Main />;
	
	case "create":
		return <DataPicker onFinish={()=>setStage("loaded")} />;
	
	default:
		return null;
	}
}

function Main() {
	const [activePath, setActivePath] = useState();
	const [showRegModel, setShowRegModel] = useState(false);
	const [showGrpModel, setShowGrpModel] = useState(false);
	const [showExpModel, setShowExpModel] = useState(false);
	const [content, setContent] = useState();

	useEffect(() => {
		const handleUpdate = ({oldData, newData}) => {
            const oldKey = oldData.parent + oldData.name;
            const newKey = newData.parent + newData.name;
			setActivePath(path => path && path.replace(oldKey, newKey));
		}
		regDb.subscribe(handleUpdate, "update");
		return () => regDb.unsubscribe(handleUpdate, "update");
	}, []);

	useEffect(() => {
		if (!activePath) {
			setContent(<Empty description="Please select one entry from the left panel, or create new ones."/>);
		} else if (!activePath.endsWith("/")) {
			setContent(<RegView path={activePath}/>)
		}
	}, [activePath]);

	useEffect(() => {
		const handleDelete = ({deletedKeys}) => {
			if (deletedKeys.includes(activePath)) {
				setActivePath();
			}
		}
		regDb.subscribe(handleDelete, "delete");
		return () => regDb.unsubscribe(handleDelete, "delete");
	}, [activePath])

	const siderWidth = 320; // px
	const parent = (() => {
		if (!activePath) return "/";
		return activePath.split("/").slice(0, -1).join('/') + "/";
	})();

	const reader = new FileReader();
	reader.onload = async () => {
		try {
			await regDb.import(reader.result);
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
	};

	const handleImport = (e) => {
		reader.readAsText(e.target.files[0]);
		e.target.value = null; // so can load same file (same name)
	};

	return (
		<Layout>
			<Header style={{position: "fixed", zIndex: 1, width: "100%"}}>
				<Row type="flex" justify="space-between">
					<Col>
						<div style={{color: "white", fontSize: "1.5rem"}}>RegView</div>
					</Col>
					<Col>
						<Button.Group>
							<Button ghost type="primary" icon={<FolderAddOutlined />} onClick={()=>setShowGrpModel(true)}>New Group</Button>
							<Button ghost type="primary" icon={<FileAddOutlined />} onClick={()=>setShowRegModel(true)}>New Register</Button>
							<Button ghost type="primary" icon={<ExportOutlined />} onClick={()=>setShowExpModel(true)}>Export</Button>
							<label className="ant-btn ant-btn-primary ant-btn-background-ghost" >
								<ImportOutlined />
								<span style={{marginLeft: 8}}>Import</span>
								<input style={{display: "none"}} type="file" accept="application/json" onChange={handleImport}/>
							</label>
						</Button.Group>
					</Col>
				</Row>
			</Header>
			<Layout style={{marginTop: 64}}>
				<Sider 
					width={siderWidth} theme="light"
					style={{
						overflow: 'auto',
						height: 'calc(100vh - 64px)',
						position: 'fixed',
						left: 0,
					}}
				>
					<RegList onSelect={setActivePath}/>
				</Sider>
				<Layout style={{ 
					marginLeft: siderWidth,
					background: '#fff',
					padding: "16px 24px",
				}}>
					<Content>
						{content}
					</Content>
				</Layout>
			</Layout>
			{showRegModel && <RegEditorModal
				parent={parent}
				activePath={activePath}
				title="Create New Register"
				hide={()=>setShowRegModel(false)}
			/>}
			{showGrpModel && <GroupEditorModal
				parent={parent}
				title="Create New Group"
				hide={()=>setShowGrpModel(false)}
			/>}
			{showExpModel && <ExporterModal
				hide={()=>setShowExpModel(false)}
			/>}
		</Layout>
	);
}