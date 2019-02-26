import React, { Component, Fragment } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { parsePath } from './Utils';
import { Exporter, Deleter } from './Form';

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

class NavBar extends Component {
	// breadcrumb navigation
	getBreadcrumb = (op, path) => {
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

			if (i + 1 === segs.length) {
				links.push(
					<li key={dest}>{segs[i]}</li>
				);
			} else {
				links.push(
					<li key={dest}><NavLink to={dest}>{segs[i]}</NavLink></li>
				);
			}
		}

		return (
			<ul className="nav-breadcrumb">
				{links}
			</ul>
		);
	}

	// dropdown action menu
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
					<Deleter path={path}>Delete (recursively)</Deleter>
					<Exporter path={path} format="json">Export as JSON...</Exporter>
					<Exporter path={path} format="macro">Export as Macro...</Exporter>
					<Exporter path={path} format="template">Export as Bitpack...</Exporter>
				</Fragment>;
		} else {
			actions = 
				<Fragment>
					<Link to={"/edit" + path}>Edit this register</Link>
					<Deleter path={path}>Delete (recursively)</Deleter>
					<Exporter path={path} format="json">Export as JSON...</Exporter>
					<Exporter path={path} format="macro">Export as Macro...</Exporter>
					<Exporter path={path} format="template">Export as Bitpack...</Exporter>
				</Fragment>;
		}

		return (
			<DropdownMenu>
				{actions}
			</DropdownMenu>
		);
	}
	
	render = () => {
		const [op, path] = parsePath(this.props.location.pathname);
		return (
			<div className="nav-container">
				<NavLink className="home-btn" to="/view/"><FontAwesomeIcon icon="home" /></NavLink>
				{ this.getBreadcrumb(op, path) }
				{ this.getActions(op, path) }
			</div>
		);
	}
}

export default NavBar;
