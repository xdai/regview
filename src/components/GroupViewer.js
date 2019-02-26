import React, { Component, Fragment } from 'react';
import { Redirect, Link } from "react-router-dom";

import './GroupViewer.css';

class GroupTitle extends Component {
	render() {
		const data = this.props.data;
		const path = data.parent + data.name;
		return (
			<Link className="group-title" to={'/view' + path}>
				<span>{data.name.slice(0, -1)}</span>
				<span>0x{this.props.address.toString(16).toUpperCase()}</span>
			</Link>
		);
	}
}

class RegTitle extends Component {
  render() {
    const path = this.props.path;
	const reg  = this.props.data[path].node;
	const address = this.props.data[path].address;
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

class Group extends Component {
	render() {
		if (this.props.data) {
			const root = this.props.data[this.props.path];
			const node = root.node;
			const address = root.address;
			const children = root.children;
			let content = [];

			children.forEach((childKey) => {
				if (childKey.endsWith('/')) {
					content.push(
						<li key={childKey}><Group path={childKey} data={this.props.data}/></li>
					);
				} else {
					content.push(
						<li key={childKey}><RegTitle path={childKey} data={this.props.data}/></li>
					);
				}
			});
			
			return (
				<Fragment>
					{
						// Render a title for non-root group
						node && node.parent && <GroupTitle data={node} address={address} />
					}
					<ol>
						{
							// Now render all the children
							content
						}
					</ol>
				</Fragment>
			);
		} else { // The group doesn't exit, ask the user to create one (redirect)
			return (<Redirect to={"/edit" + this.props.path}/>);
		}
	}
}

class GroupViewer extends Component {
	render() {
		return (
			<div className="reg-group">
				<Group {...this.props} />
			</div>
		)
	}
}

export default GroupViewer;
