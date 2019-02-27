import React, { Component } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';
import { convertTo } from './Converter';
import { splitKey } from './Utils';

import './Form.css';

export class Warning extends Component {
	render() {
		return (
			<div className="warning">
				{this.props.children}
			</div>
		);
 	}
}

export class PathLabel extends Component {
	render() {
		return (
			<span className="path-label">{this.props.children}</span>
		);
	}
}

export class NameInput extends Component {
	render() {
		return (
			<input type="text" {...this.props}/>
		);
	}
}

export class Exporter extends Component {
	saveAs = (content, filename) => {
	    var dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
	    var downloadAnchorNode = document.createElement('a');
	    downloadAnchorNode.setAttribute("href",     dataStr);
		downloadAnchorNode.setAttribute("download", filename);
	    document.body.appendChild(downloadAnchorNode); // required for firefox
	    downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}

	exportAs = (format) => {
		const path = this.props.path;

		let name = splitKey(path)[1];
		if (name === '/') {
			name = 'register';
		}
		if (name.endsWith('/')) {
			name = name.slice(0, -1);
		}
		name += format === 'json' ? '.json' : '.h';

		regDb.getHierarchy(path).then((data) => this.saveAs(convertTo(data, format).data, name));
	}

	render() {
		return (
			<span onClick={() => this.exportAs(this.props.format)}>
				{this.props.children}
			</span>
		);
	}
}

export class Deleter extends Component {
	constructor(props) {
		super(props);

		this.state = {
			deleted: false
		};
	}
	
	deleteHierarchy = () => {
		if (window.confirm(`This will recursively delete everything under ${this.props.path} (inclusive). This cannot be undone. You sure?`)) {
			regDb.delete(this.props.path).then(() => {
				this.setState({
					deleted: true
				});
			});
		}
	}

	componentDidUpdate(prevProps) {
		if (this.state.deleted) {
			this.setState({
				deleted: false
			});
		}
	}
	
	render() {
		const [parentKey] = splitKey(this.props.path);

		return this.state.deleted ? (
			<Redirect to={parentKey ? '/view' + parentKey : '/'} />
		) : (
			<span onClick={this.deleteHierarchy}>
				 {this.props.children}
			</span>
		)
	}
}
