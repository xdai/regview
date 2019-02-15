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
		const addr = this.props.match.params[0];
		const isGroup = addr.endsWith('/') || addr === '';
		let segs = addr.split('/');
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
			actions = 
				<Fragment>
					<Link to={"/edit/" + addr}>Edit</Link>
					<Link to={"/edit/" + addr}>Edit</Link>
				</Fragment>;
		} else {
			actions = 
				<Fragment>
					<Link to={"/edit/" + addr}>Edit</Link>
					<Link to={"/edit/" + addr}>Edit</Link>
					<Link to={"/edit/" + addr}>Edit</Link>
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
