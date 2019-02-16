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

export class Record {
	constructor(db, path, cache) {
		this.db   = db;
		this.path = path;
		this.cache = cache;
		this.type = path.endsWith('/') ? 'group' : 'register';
		this.segs = path.split('/');

		this.segs.shift();
		if (this.type === 'group') {
			this.segs.pop(); // remove the tailing empty string
		}

		this.ancestorCount = this.segs.length;
	}

	// Load raw data from IndexedDb. Use cached value if exist.
	loadRawData = () => {
		if (this.cache !== undefined) {
			return Promise.resolve(this.cache);
		} else {
			return this.db.get(this.path).then((val) => {
				this.cache = val || null;
				return this.cache;
			});
		}
	}
	
	// Load data with address info populated. Use cached value if exist.
	load = () => {
		if (this.cache && this.cache.address !== undefined) {
			return Promise.resolve(this.cache);
		} else {
			return this.loadRawData().then((data) => {
				if (data) {
					return this.getBase().then((base) => {
						data.address = base + parseInt(data.offset, 16);
						this.cache = data;
						return data;
					})
				} else {
					return null;
				}
			});
		}
	}

	loadTree = () => {
		let translate = (recordTree) => {
			return recordTree.node.load().then(
				rootData => Promise.all(
					recordTree.children.map(child => translate(child))
				).then(childDataArray => ({
					node: rootData,
					children: childDataArray
				}))
			)
		};

		return this.getTree().then((tree) => {
			return tree ? translate(tree) : null;
		});
	}

	getParent = () => {
		if (this.path === '/') {
			return null;
		} else {
			let val = '/';
			for (let i = 0; i < this.segs.length - 1; i++) {
				val += this.segs[i] + '/';
			}
			return new Record(this.db, val);
		}
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

	getChildren = () => {
		return this.db.getChildren(this.path).then((children) => {
			return children.map(child => new Record(
				this.db, child.parent + child.name, child
			));
		});
	}

	getTree = () => {
		let _getTree = (rootRecord) => {
			return rootRecord.getChildren().then(
				children => Promise.all(
					children.map(child => _getTree(child))
				).then(
					subTreeArray => ({
						node: rootRecord,
						children: subTreeArray
					})
				)
			);
		};

		return this.load().then((data) => {
			return (data || this.path === '/') ? _getTree(this) : Promise.resolve(null);
		});
	}

	update = (data) => {
		return this.db.put(data);
	}

	delete = () => {
		return this.db.delete()
	}
	
	// Async operation, returns a promise
	getBase = () => {
		const parent = this.getParent();

		if (parent) {
			return parent.getAddress();
		} else {
			return Promise.resolve(0);
		}
	}
	
	// Async operation, returns a promise
	getOffset = () => {
		return this.loadRawData().then((data) => {
			if (data) {
				return parseInt(data.offset, 16);
			} else {
				return null;
			}
		});
	}

	// Async operation, returns a promise
	getAddress = () => {
		return this.load().then((data) => {
			if (data) {
				return data.address;
			} else {
				return null;
			}
		});
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
			return new Record(this.context, segs.join('/'));
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