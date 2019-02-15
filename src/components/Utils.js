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

	load = () => {
		return this.db.get(this.path).then((data) => {
			if (data) {
				return this.getBase().then((base) => {
					data.address = base + parseInt(data.offset, 16);
					return data;
				})
			} else {
				return null;
			}
		});
	}
	
	// Async operation, returns a promise
	getBase = () => {
		const parent = this.getParent();

		if (parent) {
			return parent.getAddress();
		} else {
			return new Promise((resolve, reject) => {
				resolve(0);
			});
		}
	}
	
	// Async operation, returns a promise
	getOffset = () => {
		return this.db.get(this.path).then((data) => {
			if (data) {
				return parseInt(data.offset, 16);
			} else {
				return null;
			}
		});
	}

	// Async operation, returns a promise
	getAddress = () => {
		return this.getOffset().then((offset) => {
			if (offset === null) { // non-exist record
				return null;
			} else { // record exists, which implies that parent also exists
				return this.getBase().then((base) => {
					return base + offset;
				})
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
				data: undefined
			};
		}

		getCurrentRecord = () => {
			let segs = this.props.location.pathname.split('/');
			segs.splice(1,1); // remove the `op` part
			return new Record(this.context, segs.join('/'));
		}

		load() {
			this.getCurrentRecord().load().then((data) => {
				this.setState({
					data: data
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
			if (this.state.data === undefined) {
				return null;
			} else {
				console.log(this.state);
				return <WrappedComponent data={this.state.data} {...this.props} />;
			}
		}
	};
}