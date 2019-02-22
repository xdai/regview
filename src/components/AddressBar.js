import React, { Component, Fragment } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { parsePath } from './Utils';

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome } from '@fortawesome/free-solid-svg-icons'

import './AddressBar.css';

library.add(faHome);

//------------------------------------------------------------
class DropdownMenu extends Component {
	render() {
		return (
			<div className="dropdown">
				<button className="dropdown-btn">Action</button>
				<div className="dropdown-content">
					{this.props.children}
				</div>
			</div>
		);
	}
}

class AddressBar extends Component { // breadcrumb navigation
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

		let actions;
		if (isGroup) {
			const newRegLocation = {
				pathname: '/new/register' + path,
			};
			const newGrpLocation = {
				pathname: '/new/group' + path,
			};
			actions = 
				<Fragment>
					{path && <Link to={"/edit" + path}>Edit this group</Link>}
					<Link to={newGrpLocation}>Add new group</Link>
					<Link to={newRegLocation}>Add new register</Link>
				</Fragment>;
		} else {
			actions = 
				<Fragment>
					<Link to={"/edit" + path}>Edit this register</Link>
				</Fragment>;
		}

		return (
			<DropdownMenu>
				{actions}
			</DropdownMenu>
		);
	}
	
	render() {
		const [op, path] = parsePath(this.props.location.pathname);
		console.log(`${op} ---- ${path}`);
		return (
			<div className="nav-container">
				<NavLink className="home-btn" to="/view/"><FontAwesomeIcon icon="home" /></NavLink>
				{ this.getTitle(op, path) }
				{ this.getActions(op, path) }
			</div>
		);
	}
}

export default AddressBar;
