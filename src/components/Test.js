import React from 'react';
import { Form, Input, Button } from 'antd';
import { ImportOutlined } from '@ant-design/icons';

export default function Test(props) {
    return true ? (
        <ExportBtn/>
    ) : (
        // avoid `unused var` warning
        <>
            <FormValidation/>
            <Noisy/>
        </>
    );
}

function ExportBtn(props) {
    const readData = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            console.log(reader.result)
        };
        reader.readAsText(file);
    };

    const handleUpload = (e) => {
        readData(e.target.files[0]);
    };
    
    return (<>
        <Button type="primary" icon={<ImportOutlined />}>
            <label style={{marginLeft: 8}}>
                Import
                <input style={{display: "none"}} type="file" accept="application/json" onChange={handleUpload}/>
            </label>
        </Button>
        <br/><br/>
        <label className="ant-btn ant-btn-primary ant-btn-background-ghost" >
            <ImportOutlined />
            <span style={{marginLeft: 8}}>Import</span>
            <input style={{display: "none"}} type="file" accept="application/json" onChange={handleUpload}/>
        </label>
        <br/><br/>
        <Button ghost type="primary" icon={<ImportOutlined />}>
                Import
        </Button>
    </>)
}

function FormValidation(props) {
	const [form] = Form.useForm();

	const onFinish = values => {
		console.log(values);
	};

	const onValidate = () => {
		form.validateFields([
			["note"]
		]).then(
			v => console.log(v)
		).catch(
			e => console.log(e)
		)
	}

	return (
		<Form form={form} onFinish={onFinish}>
			<Form.Item
				name={["note", "name"]}
				label="Name"
				rules={[{required: true,}]}
			>
				<Input />
			</Form.Item>
			<Form.Item
				name={["note", "value"]}
				label="Value"
				rules={[{required: true,}]}
			>
				<Input />
			</Form.Item>
			<Form.Item>
				<Button type="primary" htmlType="submit">
					Submit
				</Button>
				<Button htmlType="button" onClick={onValidate}>
					Validate
				</Button>
			</Form.Item>
		</Form>
	);
}

class Noisy extends React.Component {
    constructor(props) {
        super(props);
        console.log("constructor");
    }

    render() {
        console.log("render");
        const width=`${this.props.getFieldValue("width")}00px`;
        return (
            <div style={{backgroundColor: "grey", height: "100px", width: width}} />
        );
    }

    componentDidMount() {
        console.log("componentDidMount");
    }

    componentDidUpdate() {
        console.log("componentDidUpdate");
    }

    componentWillUnmount() {
        console.log("componentWillUnmount");
    }
};