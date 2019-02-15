import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Redirect, Link } from "react-router-dom";

import { RegContext } from '../RegDb';

import RegSummary from './RegSummary';

import { Path } from './Utils';

import './GroupViewer.css';

class GroupTitle extends Component {
	static propTypes  = {
		base: PropTypes.number.isRequired,
		root: PropTypes.object.isRequired
	};

	render() {
		const root = this.props.root;
		const base = this.props.base;
		return (
			<Link className="reg-group-title" to={'/view' + root.parent + root.name}>
				<span>{root.name}</span>
				<span>{base.toString(16)}</span>
			</Link>
		);
	}
}

class Group extends Component {
	static propTypes = {
		path: PropTypes.string,
		root: PropTypes.object,
		base: PropTypes.number
  	};

  	static defaultProps = {
  		path: '/'
  	};
	
	static contextType = RegContext;

	constructor(props) {
		super(props);

		this.children = [];
		this.state = {
			isLoaded: false
		};
	}

	render() {
		return this.state.isLoaded ? (
			<div className="reg-group">
				{
					// If the group doesn't exit, ask the user to create one (redirect)
					this.props.path !== '/' && !this.props.root && <Redirect to={"/edit"+this.props.path} />
				}
				
				{
					// Render a title line for non-root group
					this.props.root && <GroupTitle base={this.props.base} root={this.props.root} />
				}
				
				{
					// Now render all the children
					this.children.map(c =>
						c.name.endsWith('/') ?
						<Group key={c.parent + c.name} path={c.parent + c.name} root={c} base={this.props.base + parseInt(c.offset, 16)} /> :
						<RegSummary key={c.parent + c.name} base={this.props.base} data={c} />
					)
				}
			</div>
		) : null;
	}

	componentDidMount() {
		this.load();
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.path !== prevProps.path) {
			this.reload(); // re-load on route change
		}
	}

	load() {
		const db = this.context;

		db.getChildren(this.props.path).then(val => {
			this.children = val;
			this.setState({
				isLoaded: true
			});
		});
	}

	reload() {
		this.setState({
			isLoaded: false
		});

		this.load();
	}
}

//------------------------------------------------------------
class GroupViewer extends Component {
	static contextType = RegContext;

	constructor(props) {
		super(props);

		this.base = 0;
		this.state = {
			isLoaded: false,
			root: undefined,
		};
	}
	
	getCurrentPath() {
		const path = this.props.location.pathname.slice('/view'.length);

		return path.endsWith('/') ? path : path + '/';
	}

	render() {
		return this.state.isLoaded ? (
			<div>
				<Group path={this.getCurrentPath()} root={this.state.root} base={this.base} />
			</div>
		) : null;
	}

	componentDidMount() {
		this.load();
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.location.pathname !== prevProps.location.pathname) {
			this.load(); // re-load on route change
		}
	}

	load() {
		const path = this.getCurrentPath();
		if (path === '/') {
			this.base = 0;
			this.setState({
				isLoaded: true,
				root: undefined
			});
		} else {
			const db = this.context;
			let seg = path.split('/').slice(1, -1);
			let key = '/' + seg.shift() + '/';
			this.base = 0;
			let self = this;

			db.get(key).then(function iter(val) {
				if (!val) {
					self.setState({
						isLoaded: true,
						root: val
					});
					return;
				}
				self.base += parseInt(val.offset, 16);
				if (val.parent + val.name === path) {
					self.setState({
						isLoaded: true,
						root: val
					});
				} else {
					key += seg.shift() + '/';
					return db.get(key).then(iter);
				}

			});
		}
	}
}

export default GroupViewer;
