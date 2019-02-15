import React, { Component } from 'react';
import { Redirect, Link } from "react-router-dom";

import { RegContext } from '../RegDb';

import './DataPicker.css'

//------------------------------------------------------------
class DataPicker extends Component {
	static contextType = RegContext;

	constructor(props) {
		super(props);

		this.importData = this.importData.bind(this);
		this.fileRef = React.createRef();

		this.state = {
			isDecided: false,
			count: 0
		};
	}

	render() {
		const db = this.context;
		return this.state.isDecided ? (
			<div id="data-source">
				{
					/* 
					 * If the store already contains some data, there is no need to import or
					 * start fresh. Let's just show them. 
					 */
					this.state.count > 0 && <Redirect to="/view/" />
				}
				<Link to="/new/group" className="data-picker" onClick={() => db.export('/Capability')}>
					Start Fresh
				</Link>

				<label className='data-picker'>
					<input type="file" ref={this.fileRef} onChange={this.importData}/>
					Import from JSON
				</label>
			</div>
		) : null;
	}

	componentDidMount() {
		const db = this.context;
		db.count().then(n => {
			this.setState({
				isDecided: true,
				count: n
			});
		});
	}

	importData(e) {
		const file = this.fileRef.current.files[0];
		const db = this.context;

		if (file.type.match(/application\/json/)) {
			let reader = new FileReader();
			let history = this.props.history;

			reader.onload = (e) => {
    			db.import(JSON.parse(reader.result)).then(() => {
    				history.push('/view/');
    			});
    		};

    		reader.readAsText(file);
		}
	}
}

export default DataPicker;
