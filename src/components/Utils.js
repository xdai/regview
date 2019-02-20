import React, { Component } from 'react';
import { RegContext } from '../RegDb';

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
	if (key === '/') {
		return [undefined, '/'];
	}

	return key.match(/^(.*\/)(.+)$/).slice(1, 3);
}

let recordCache = [];
export function getRecord(db, path, data) {
	if (!recordCache[path]) {
		recordCache[path] = new Record(db, path, data);
	}
	return recordCache[path];
}

export class Record {
	constructor(db, path) {
		this.db   = db;
		this.path = path;
		this.type = path.endsWith('/') ? 'group' : 'register';
		this.segs = path.split('/');

		this.segs.shift();
		if (this.type === 'group') {
			this.segs.pop(); // remove the tailing empty string
		}

		this.ancestorCount = this.segs.length;
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

	getAncestor = (n) => {
		if (n >= this.ancestorCount) {
			return null;
		} else {
			let val = '/';
			for (let i = 1; i <= n; i++) {
				val += this.segs[i-1] + '/';
			}
			return new Record(this.db, val);
		}
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

	update = (data) => {
		return this.db.put(data);
	}

	delete = () => {
		return this.db.delete()
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

export function withReload(WrappedComponent) {
	return class extends Component {
		static contextType = RegContext;

		constructor(props) {
			super(props);

			this.state = {
				path: undefined,
				data: undefined
			};
		}

		getCurrentRecord = () => {
			let segs = this.props.location.pathname.split('/');
			segs.splice(1,1); // remove the `op` part
			return getRecord(this.context, segs.join('/'));
		}

		load() {
			const record = this.getCurrentRecord();

			switch (record.type) {
			case 'group':
				record.loadTree().then((tree) => {
					this.setState({
						path: record.path,
						data: tree
					});
				});
				break;
			
			case 'register':
				record.load().then((data) => {
					this.setState({
						path: record.path,
						data: data
					});
				});
				break;
			
			default:
				break;
			}
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
			if (this.state.data === undefined) {
				return null;
			} else {
				return <WrappedComponent path={this.state.path} data={this.state.data} {...this.props} />;
			}
		}
	};
}