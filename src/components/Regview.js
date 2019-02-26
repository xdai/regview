import React, { Component } from 'react';
import { Route, Switch, Redirect } from "react-router-dom";

import Page404 from './Page404';
import DataPicker from './DataPicker';
import GroupViewer from './GroupViewer';
import RegisterViewer from './RegisterViewer';
import GroupEditor from './GroupEditor';
import RegEditor from './RegEditor';
import NavBar from './NavBar';
import { withReload } from './Utils';

import './Regview.css'

//------------------------------------------------------------
class Regview extends Component {
	// componentDidMount() {
	// 	regDb.load().then(() => {
	// 		this.setState({
	// 			loading: false
	// 		});
	// 	});
	// }

	render() {
		return ( 
			<div className="regview">
				<Route path="/:op/*" component={NavBar} />
				<Switch>
					<Route path="/"                component={() => <Redirect to="/view/"/>}                 exact />
					<Route path="/import"          component={DataPicker}  />
					<Route path="/view/"           component={withReload(GroupViewer)}    exact />
					<Route path="/view/:path(.+/)" component={withReload(GroupViewer)}          />
					<Route path="/view/:path(.+)"  component={withReload(RegisterViewer)}       />
					<Route path="/edit/:path(.+/)" component={withReload(GroupEditor)}          />
					<Route path="/edit/:path(.+)"  component={withReload(RegEditor)}            />
					<Route path="/new/group/:path*"       component={withReload(GroupEditor)}                 />
					<Route path="/new/register/:path*"    component={withReload(RegEditor)}    />
					<Route                         component={Page404}                          />
				</Switch>
			</div>
		);
	}
}

export default Regview;
