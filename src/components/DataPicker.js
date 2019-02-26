import React, { Component } from 'react';
import { Redirect } from "react-router-dom";

import { regDb } from '../RegDb';

import './DataPicker.css'

//------------------------------------------------------------
class DataPicker extends Component {
	constructor(props) {
		super(props);

		this.fileRef = React.createRef();

		this.state = {
			next: undefined
		};
	}

	render() {
		if (!this.state.next) {
			return (
				<div className="data-source">
					<label className="data-picker" onClick={this.startFresh}>
						Start Fresh
					</label>

					<label className='data-picker'>
						<input type="file" ref={this.fileRef} onChange={this.importData}/>
						Import from JSON
					</label>
				</div>
			);
		} else if (this.state.next === 'add') {
			return (
				<Redirect to="/new/group/" />
			);
		} else if (this.state.next === 'view') {
			return (
				<Redirect to="/view/" />
			);
		}
	}

	startFresh = () => {
		regDb.reset().then(() => {
			this.setState({
				next: 'add'
			});
		})
	}

	importData = (e) => {
		const file = this.fileRef.current.files[0];

		if (file.type.match(/application\/json/)) {
			let reader = new FileReader();

			reader.onload = (e) => {
    			regDb.import(reader.result).then(() => {
    				this.setState({
						next: 'view'
					});
    			});
    		};

    		reader.readAsText(file);
		}
	}
}

export default DataPicker;
