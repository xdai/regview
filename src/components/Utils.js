import React, { Component } from 'react';
import { RegContext } from '../RegDb';
import { Warning } from './Form';

export function str2hex(s) {
	return parseInt(s, 16);
}

export function num2hexstr(n) {
	return "0x" + ("00000000" + n.toString(16)).toUpperCase().substr(-8);
}

export function getCoordinate(offset, width) {
	const row = Math.floor(offset / width) + 1;
	const col = width - offset % width;

	return [row, col];
}

export function isInRange(n, range) {
	return (range[0] <= n && n <= range[1]) || (range[1] <= n && n <= range[0]);
}

export function splitKey(key) {
	if (!key) {
		return [undefined, undefined];
	}
	
	if (key === '/') {
		return [undefined, '/'];
	}

	return key.match(/^(.*\/)(.+)$/).slice(1, 3);
}

export function parsePath(path) {
	const m = path.match(/^(\/new\/group|\/new\/register|\/view|\/edit)(\/.*)*/);
	if (!m) {
		throw Error(`Unrecognized path: ${path}`);
	}
	const [op, key] = m.slice(1,3);
	return [op, key || '/'];
}

export class Record {
	constructor(db, path) {
		this.db   = db;
		this.path = path;
		this.type = path.endsWith('/') ? 'group' : 'register';
	}

	loadRawData = async () => {
		return this.db.get(this.path);
	}
	
	// Load data with address info populated
	load = async () => {
		const data = await this.loadRawData();
		const address = await this.getAddress();

		return ({
			node: data.node,
			address: address
		});
	}

	loadTree = async () => {
		let translate = async (recordTree) => {
			let data = await recordTree.node.load();

			data.children = await Promise.all(
				recordTree.children.slice(0).map(
					async child => await translate(child)
				)
			);

			data.children.sort((a, b) => a.address - b.address);

			return data;
		};

		const tree = await this.getTree();
		return translate(tree);
	}

	getParent = () => {
		const [parentKey] = splitKey(this.path);
		return parentKey ? new Record(this.db, parentKey) : null;
	}

	getChildren = async () => {
		const data = await this.loadRawData();
		return data.children.slice(0).map(
			childName => new Record(this.db, childName)
		);
	}

	getTree = async () => {
		let _getTree = async (rootRecord) => {
			let children = await rootRecord.getChildren();

			const subTreeArray = await Promise.all(
				children.map(async child => await _getTree(child))
			);

			return ({
				node: rootRecord,
				children: subTreeArray
			});
		};

		return _getTree(this);
	}
	
	getBase = async () => {
		const parent = this.getParent();
		return parent ? parent.getAddress() : 0;
	}
	
	getOffset = async () => {
		const data = await this.loadRawData();
		return data.node ? parseInt(data.node.offset, 16) : 0;
	}

	getAddress = async () => {
		const base = await this.getBase();
		const offset = await this.getOffset();

		return base + offset;
	}
}

export function withReload(WrappedComponent, mode) {
	return class extends Component {
		static contextType = RegContext;

		constructor(props) {
			super(props);

			this.state = {
				path: undefined,
				data: undefined,
				error: undefined
			};
		}

		getCurrentRecord = () => {
			console.log(this.props.match);
			console.log(this.props.match.params['path']);
			const key = '/' + (this.props.match.params['path'] || '');
			return new Record(this.context, key);
		}

		load = () => {
			switch (mode) {
			case 'view':
			case 'edit':
				this.loadContent();
				break;
			case 'new':
				this.validateParent();
				break;
			default:
				break;
			}
		}

		loadContent = () => {
			const key = '/' + (this.props.match.params['path'] || '');
			const record = new Record(this.context, key);
			
			switch (record.type) {
			case 'group':
				record.loadTree().then((tree) => {
					this.setState({
						path: record.path,
						data: tree
					});
				}).catch((error) => {
					this.setState({
						error: error.message
					});
				});
				break;
			
			case 'register':
				record.load().then((data) => {
					this.setState({
						path: record.path,
						data: data
					});
				}).catch((error) => {
					this.setState({
						error: error.message
					});
				});
				break;
			
			default:
				break;
			}
		}

		validateParent = () => {
			const path = this.props.match.params['path'];
			const key = path ? '/' + path + '/' : '/';
			const record = new Record(this.context, key);

			record.load().then((data) => {
				this.setState({
					path: record.path,
					data: null
				});
			}).catch((error) => {
				this.setState({
					error: error.message
				});
			});
		}
		
		componentDidMount() {
			this.load();
		}

		componentDidUpdate(prevProps, prevState) {
			if (this.props.location.pathname !== prevProps.location.pathname) {
				this.load(); // re-load on route change
			}
		}

		render() {
			if (this.state.error) { // error
				return <Warning>{this.state.error}</Warning>;
			} else if (this.state.data === undefined) { // loading
				return null;
			}  else { // loaded
				return <WrappedComponent path={this.state.path} data={this.state.data} {...this.props} />;
			}
		}
	};
}

export function withModeNew(WrappedComponent) {
	return class extends Component {
		componentDidMount() {
			this.load();
		}
		
		componentDidUpdate(prevProps, prevState) {
			if (this.props.location.pathname !== prevProps.location.pathname) {
				this.load(); // re-load on route change
			}
		}

		render() {
			return <WrappedComponent path={this.state.path} {...this.props} />;
		}
	};
}