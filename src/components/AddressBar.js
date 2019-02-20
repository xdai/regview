import React, { Component, Fragment } from 'react';
import { Link, NavLink } from "react-router-dom";

import './AddressBar.css';

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
	render() {
		const path = this.props.match.params[0];
		const isGroup = path.endsWith('/') || path === '';
		let segs = path.split('/');
		if (isGroup) {
			segs.pop();
		}
		
		let links = [<li key="/view/"><NavLink to="/view/">Root</NavLink></li>];
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

		let actions;
		if (isGroup) {
			const newRegLocation = {
				pathname: '/new/register',
				state: {parent: '/' + path}
			};
			const newGrpLocation = {
				pathname: '/new/group',
				state: {parent: '/' + path}
			};
			actions = 
				<Fragment>
					{path && <Link to={"/edit/" + path}>Edit this group</Link>}
					<Link to={newGrpLocation}>Add new group</Link>
					<Link to={newRegLocation}>Add new register</Link>
				</Fragment>;
		} else {
			actions = 
				<Fragment>
					<Link to={"/edit/" + path}>Edit this register</Link>
				</Fragment>;
		}

		return (
			<div className="nav-container">
				<ul className="nav-breadcrumb">
					{links}
				</ul>
				<DropdownMenu>
					{actions}
				</DropdownMenu>
			</div>
		);
	}
}

export default AddressBar;
