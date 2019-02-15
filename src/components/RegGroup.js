import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Route, Link } from "react-router-dom";

import { RegContext } from '../RegDb';

import { str2hex } from "./Utils";
import RegSummary from "./RegSummary";
import Loading from './Loading';

import "./RegGroup.css";

//------------------------------------------------------------
function GroupSummary(props) {
	let history = props.history;
	return (
		<Link className="reg-group-summary" to={'/view/group' + props.parent + props.name + '/'}>
			<span>{props.name}</span>
			<span>{props.offset}</span>
		</Link>
	);
}

class RegGroup extends Component {
	static contextType = RegContext;

	constructor(props) {
		super(props);

		this.path = this.getCurrentPath();
		this.root = undefined;
		this.children = [];
		this.state = {
			isLoaded: false
		};
	}
	
	getCurrentPath() {
		const path = this.props.location.pathname.slice('/view/group'.length);

		return path === '' ? '/' : path;
	}
	
	render() {
		return this.state.isLoaded ? (
			<div className="reg-group">
				{ this.props.root && <GroupSummary {...this.props.root} history={this.props.history} /> }
				{ 
					this.children.map(e => 
						e.key.endsWith('/') ? 
						<Route key={e.key} path={"/view/group" + e.key} component={RegGroup} /> : 
						<RegSummary key={e.key} {...e.value} />
					) 
					
				}
			</div>
		) : (
			<div className="center-container">
				<Group path="/a" />
				<Loading />
			</div>
		);
	}

	load() {
		let self = this;
		let db = this.context;

		db.open().then(db => {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store');
			let index = store.index('parent');
			return index.openCursor(this.path);
		}).then(function getChild(cursor) {
			if (!cursor) {
				return;
			}
			self.children.push({"key": cursor.primaryKey, "value": cursor.value});
			return cursor.continue().then(getChild);
		}).then(() => {
			this.setState({
				isLoaded: true
			});
		})
	}

	componentDidMount() {
		//this.load();
	}

	componentDidUpdate(prevProps) {
		if (this.props.path !== prevProps.path) {
			this.setState({
				isLoaded: false
			});
			this.children = [];
			this.load();
		}
	}
}

export default RegGroup;
