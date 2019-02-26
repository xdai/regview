import React, { Component } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';
import { Warning, PathLabel } from './Form';

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

export function withReload(WrappedComponent) {
	return class extends Component {
		constructor(props) {
			super(props);

			this.state = {
				op: undefined,
				path: undefined,
				data: undefined,
				error: undefined
			};
		}

		load = async () => {
			const [op, path] = parsePath(this.props.location.pathname);

			try {
				const data = await this.loadContent(op, path);
				this.setState({
					op: op,
					path: path,
					data: data,
					error: undefined
				});
			} catch(error) {
				const n = await regDb.count();

				if (n === 0) {
					this.setState({
						op: op,
						path: path,
						data: undefined,
						error: 'db-empty'
					});
				} else {
					this.setState({
						op: op,
						path: path,
						data: undefined,
						error: 'load-failure'
					});
				}
			}
		}

		loadContent = async (op, path) => {
			switch (op) {
			case '/view':
				if (path.endsWith('/')) {
					return regDb.getSubTree(path);
				} else {
					return regDb.get(path);
				}
			case '/edit':
			case '/new/group':
			case '/new/register':
				return regDb.get(path);
			default:
				break;
			}
		}
		
		componentDidMount() {
			this.load();
		}

		componentDidUpdate(prevProps) {
			if (this.props.location.pathname !== prevProps.location.pathname) {
				this.load(); // re-load on route change
			}
		}

		render() {
			if (this.state.error) { // error
				if (this.state.error === 'db-empty') {
					return <Redirect to="/import" />;
				} else {
					return (
						<Warning>
							Entry <PathLabel>{this.state.path}</PathLabel> doesn't exist
						</Warning>
					)
				}
			} else if (this.state.data === undefined) { // loading
				return null;
			}  else { // loaded
				return <WrappedComponent op={this.state.op} path={this.state.path} data={this.state.data} {...this.props} />;
			}
		}
	};
}
