import React, { Component, Fragment } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { RegContext } from '../RegDb';
import { parsePath } from './Utils';
import { convertTo } from './Converter';

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faBars } from '@fortawesome/free-solid-svg-icons'

import './NavBar.css';

library.add(faHome, faBars);

//------------------------------------------------------------
class DropdownMenu extends Component {
	render() {
		return (
			<div className="dropdown">
				<button className="dropdown-btn"><FontAwesomeIcon icon="bars" /></button>
				<div className="dropdown-content">
					{this.props.children}
				</div>
			</div>
		);
	}
}

class NavBar extends Component { // breadcrumb navigation
	static contextType = RegContext;

	getTitle = (op, path) => {
		const isGroup = path.endsWith('/');
		
		let segs = path.split('/');
		segs.shift();
		if (isGroup) {
			segs.pop();
		}
		
		let links = [];
		for (let i = 0; i < segs.length; i++) {
			let dest = "/view/" + segs.slice(0, i + 1).join("/")
			if (i + 1 === segs.length && !isGroup) {
				// path to a register doesn't end with '/'
			} else {
				dest += "/";
			}
			links.push(
				<li key={dest}><NavLink to={dest}>{segs[i]}</NavLink></li>
			);
		}

		return (
			<ul className="nav-breadcrumb">
				{links}
			</ul>
		);
	}

	getActions = (op, path) => {
		const isGroup = path.endsWith('/');

		if (op !== '/view') {
			return null;
		}

		let actions;
		if (isGroup) {
			actions = 
				<Fragment>
					{path !== '/' && <Link to={"/edit" + path}>Edit this group</Link>}
					<Link to={'/new/group' + path}>Add new group</Link>
					<Link to={'/new/register' + path}>Add new register</Link>
					<span onClick={this.exportAsJson}>Export as JSON...</span>
					<span onClick={this.exportAsMacro}>Export as C/C++ Macro...</span>
					<span onClick={this.exportAsTemplate}>Export as C++ Template...</span>
				</Fragment>;
		} else {
			actions = 
				<Fragment>
					<Link to={"/edit" + path}>Edit this register</Link>
					<span onClick={this.exportAsJson}>Export as JSON...</span>
					<span onClick={this.exportAsMacro}>Export as C/C++ Macro...</span>
					<span onClick={this.exportAsTemplate}>Export as C++ Template...</span>
				</Fragment>;
		}

		return (
			<DropdownMenu>
				{actions}
			</DropdownMenu>
		);
	}

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
		const path = parsePath(this.props.location.pathname)[1];
		const db = this.context;

		db.export(path).then((data) => this.saveAs(...convertTo(data, format)));
	}

	exportAsJson = () => this.exportAs('json');
	exportAsMacro = () => this.exportAs('macro');
	exportAsTemplate = () => this.exportAs('template');
	
	render = () => {
		const [op, path] = parsePath(this.props.location.pathname);
		return (
			<div className="nav-container">
				<NavLink className="home-btn" to="/view/"><FontAwesomeIcon icon="home" /></NavLink>
				{ this.getTitle(op, path) }
				{ this.getActions(op, path) }
			</div>
		);
	}
}

export default NavBar;
