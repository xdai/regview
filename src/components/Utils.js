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

export class Path {
	constructor(str) {
		this.raw = str;
		this.isRegister = !str.endsWith('/');
		this.segs = str.split('/');

		this.segs.shift();
		if (!this.isRegister) {
			this.segs.pop(); // remove the tailing empty string
		}

		this.ancestorCount = this.segs.length;
	}

	getParent = () => {
		if (this.raw === '/') {
			return null;
		} else {
			let val = '/';
			for (let i = 0; i < this.segs.length - 1; i++) {
				val += this.segs[i] + '/';
			}
			return new Path(val);
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
			return new Path(val);
		}
	}

	// Async operation, returns a promise
	getAddress = (db) => {
		const parent = this.getParent();
			
		if (parent) {
			return db.get(this.raw).then((data) => {
				if (data) {
					return parent.getAddress(db).then((base) => {
						if (base === null) {
							return null;
						} else {
							return base + parseInt(data.offset, 16);
						}
					});
				} else {
					return null;
				}
			})
		} else {
			return new Promise((resolve, reject) => {
				resolve(0);
			});
		}
	}
}

export function withReload(WrappedComponent) {
	return class extends Component {
		static contextType = RegContext;

		constructor(props) {
			super(props);

			this.state = {
				data: undefined,
				address: undefined
			};
		}

		getCurrentPath = () => {
			let segs = this.props.location.pathname.split('/');
			segs.splice(1,1); // remove the `op` part
			const key = segs.join('/');
			return new Path(key);
		}

		// Address == Base + Offset
		// Async operation, returns a promise
		getBase = (path) => {
			const db = this.context;
			const parent = path.getParent();

			if (parent) {
				return parent.getAddress(db);
			} else {
				return new Promise((resolve, reject) => {
					resolve(0);
				});
			}
		}

		load() {
			const db = this.context;
			const path = this.getCurrentPath();

			db.get(path.raw).then((data) => {
				if (data) {
					console.log(data);
					return this.getBase(path).then((base) => {
						console.log(base);
						if (base === null) {
							this.setState({
								data: null,
								address: undefined
							});
						} else {
							console.log(data.offset);
							this.setState({
								data: data,
								address: base + parseInt(data.offset, 16)
							});
						}
					});
				} else {
					this.setState({
						data: null,
						address: undefined
					});
				}
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
				return <WrappedComponent path={this.getCurrentPath()} address={this.state.address} data={this.state.data} {...this.props} />;
			}
		}
	};
}