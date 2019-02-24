import React, { Component } from 'react';
import { Route, Switch } from "react-router-dom";

import RegDb, { RegContext } from "../RegDb";

import Page404 from './Page404';
import BusyIndicator from './BusyIndicator';
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
	constructor(props) {
		super(props);

		this.setDbBusy = this.setDbBusy.bind(this);
		this.db = new RegDb(this.setDbBusy);

		this.state = {
			isDbBusy: false
		}
	}

	setDbBusy(busy) {
		// this.setState({
		// 	isDbBusy: busy
		// });
	}

	render() {
		return ( 
			<RegContext.Provider value={this.db}>
				<div className="regview">
					<BusyIndicator enabled={this.state.isDbBusy} />
					<Route path="/:op/*" component={NavBar} />
					<Switch>
						<Route path="/"                component={DataPicker}                 exact />
						<Route path="/view/"           component={withReload(GroupViewer, 'view')}    exact />
						<Route path="/view/:path(.+/)" component={withReload(GroupViewer, 'view')}          />
						<Route path="/view/:path(.+)"  component={withReload(RegisterViewer, 'view')}       />
						<Route path="/edit/:path(.+/)" component={withReload(GroupEditor, 'edit')}          />
						<Route path="/edit/:path(.+)"  component={withReload(RegEditor, 'edit')}            />
						<Route path="/new/group/:path*"       component={withReload(GroupEditor, 'new')}                 />
						<Route path="/new/register/:path*"    component={withReload(RegEditor, 'new')}    />
						<Route                         component={Page404}                          />
					</Switch>
				</div>
			</RegContext.Provider>
		);
	}
}

export default Regview;
