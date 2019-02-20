import React, { Component } from 'react';
import { Redirect, Link } from "react-router-dom";

import './GroupViewer.css';

class GroupTitle extends Component {
	render() {
		const data = this.props.data;
		const path = data.parent + data.name;
		return (
			<Link className="reg-group-title" to={'/view' + path}>
				<span>{data.name.slice(0, -1)}</span>
				<span>0x{this.props.address.toString(16).toUpperCase()}</span>
			</Link>
		);
	}
}

class RegTitle extends Component {
  render() {
    const path = this.props.path;
	const reg  = this.props.data.node;
	const address = this.props.data.address;
    return (
      <Link className="reg-title" 
            to={{
              pathname: "/view" + path, 
              state: {data: reg}
            }} 
      >
        <span>{reg.name}</span>
        <span>{reg.desc_short}</span>
        <span>0x{address.toString(16).toUpperCase()}</span>
        <span>+{reg.offset}</span>
      </Link>
    );
  }
}

class GroupViewer extends Component {
	render() {
		if (this.props.data) {
			const node = this.props.data.node;
			const address = this.props.data.address;
			const children = this.props.data.children;
			let content = [];

			children.forEach((child) => {
				const path = child.node.parent + child.node.name;
				if (path.endsWith('/')) {
					content.push(
						<GroupViewer key={path} path={path} data={child}/>
					);
				} else {
					content.push(
						<RegTitle key={path} path={path} data={child}/>
					);
				}
			});
			
			return (
				<div className="reg-group">
					{
						// Render a title for non-root group
						node && node.parent && <GroupTitle data={node} address={address} />
					}
					
					{
						// Now render all the children
						content
					}
				</div>
			);
		} else { // The group doesn't exit, ask the user to create one (redirect)
			return (<Redirect to={"/edit" + this.props.path}/>);
		}
	}
}

export default GroupViewer;
