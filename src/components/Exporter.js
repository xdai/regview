import React from 'react';

// antd
import { Modal, Form, Select } from 'antd';

import GroupSelect from './GroupSelect';
import Converter from './Converter';
import { splitKey } from './Utils';

export default function Exporter(props) {
    const {form, onFinish} = props;

    const saveAs = (content, filename) => {
	    var dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
	    var downloadAnchorNode = document.createElement('a');
	    downloadAnchorNode.setAttribute("href",     dataStr);
		downloadAnchorNode.setAttribute("download", filename);
	    document.body.appendChild(downloadAnchorNode); // required for firefox
	    downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}

    const exportData = async ({source, format}) => {
        let filename = splitKey(source)[1];
		if (filename === '/') {
			filename = 'register';
		}
		if (filename.endsWith('/')) {
			filename = filename.slice(0, -1);
        }
        filename += Converter[format].extension;

        const data = await Converter[format].handle(source);
        saveAs(data, filename)
        onFinish();
    }

    const formProps = {
		labelCol:   { span: 4  },
		wrapperCol: { span: 20 },
		form, 
        initialValues: {
            source: "/",
            format: 0,
        },
        onFinish: exportData,
    }
    
    return (
        <Form {...formProps}>
            <Form.Item 
                label="Source"
                name="source"
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
            <Form.Item
                label="Format"
                name="format"
                validateFirst
                rules={
                    [{
                        type: "number",
                        required: true,
                        message: "required"
                    }]
                }
            >
                <Select>{
                    Converter.map((v, i) => (
                        <Select.Option key={i} value={i}>
                            {v.description}
                        </Select.Option>
                    ))
                }</Select>
            </Form.Item>
        </Form>
    );
}

export function ExporterModal(props) {
    const {hide} = props;
    const [form] = Form.useForm();

    const modalProps = {
        title: "Export Data",
        width: 480,
        visible: true,
        maskClosable: false,
        onOk: form.submit,
        onCancel: hide,
    };

    return (
        <Modal {...modalProps}>
            <Exporter form={form} onFinish={hide}/>
        </Modal>
    );
}