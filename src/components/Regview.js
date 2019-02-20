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
import AddressBar from './AddressBar';
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
					<Route path="/:op/*" component={AddressBar} />
					<Switch>
						<Route path="/"                component={DataPicker}                 exact />
						<Route path="/view/"           component={withReload(GroupViewer)}    exact />
						<Route path="/view/:path(.+/)" component={withReload(GroupViewer)}          />
						<Route path="/view/:path(.+)"  component={withReload(RegisterViewer)}       />
						<Route path="/edit/:path(.+/)" component={withReload(GroupEditor)}          />
						<Route path="/edit/:path(.+)"  component={withReload(RegEditor)}            />
						{/* <Route path="/new/register"    component={}                           exact />
						<Route path="/new/group"       component={}                           exact /> */}
						<Route                         component={Page404}                          />
					</Switch>
				</div>
			</RegContext.Provider>
		);
	}
}

export default Regview;
