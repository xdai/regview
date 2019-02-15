import React, { Component } from 'react';

import { getCoordinate } from './Utils';

import './RegContainer.css';

//------------------------------------------------------------
export class UnusedField extends Component {
	render() {
		let fragments = [];
		let low = this.props.low;
		let high = this.props.high;
		let roundUp = (p,w) => ((Math.floor(p / w) + 1) * w - 1);

		while(low <= high) {
			const pos = Math.min(high, roundUp(low, this.props.width));
			const row = Math.floor(low / this.props.width) + 1;
			const col = this.props.width - pos % this.props.width
			const width = pos - low + 1;
			fragments.push(
				<FieldFragment key={pos} name={"Rsvd"} row={row} col={col} width={width} valid={false}/>
			);
			low = pos + 1;
		}

		return fragments;
	}
}

export class Field extends Component {
	constructor(props) {
		super(props);
		this.state = {
			renderMode: "view"
		};
	}

	startUpdating = (e) => {
		this.setState({
			renderMode: "updating"
		});
		this.props.onStartUpdating(this.props.bits[0]);
	}

	render() {
		let low  = this.props.bits[0];
		let high = this.props.bits[1];
		
		let fragments = [];
		let roundUp = (p,w) => ((Math.floor(p / w) + 1) * w - 1);

		while(low <= high) {
			const pos = Math.min(high, roundUp(low, this.props.width));
			const [row, col] = getCoordinate(pos, this.props.width);
			const width = pos - low + 1;
			fragments.push(
				<FieldFragment 
					key={low}
					name={this.props.name}
					row={row}
					col={col}
					width={width}
					valid={true}
					startUpdating={this.startUpdating}
				/>
			);
			low = pos + 1;
		}
		return fragments;
	}
}

/*
 * Props:
 *   - row: row number in the grid (base 1)
 *   - col: column number in the grid (base 1)
 *   - width: bit width of the fragment
 *   - name: name of the field
 */
 class FieldFragment extends Component {
 	render() {
 		const fragStyle = {
 			gridRow: this.props.row,
 			gridColumnStart: this.props.col,
 			gridColumnEnd: this.props.col + this.props.width,
 		};
 		return (
 			<div 
 				className={this.props.valid ? "field-fragment" : "field-fragment-unused"} 
 				style={fragStyle}
 				onClick={this.props.startUpdating}
 			>
 				{this.props.name}
 			</div>
 		);
 	}
 }

class BitPosMarker extends Component {
 	render() {
 		let marker = [];

 		for (let i=this.props.width-1; i>=0; i--) {
 			marker.push(
 				<div key={i} className="bit-pos-indicator">{i}</div>
 			);
 		}

 		return (
 			<div className="bit-pos-marker"> {marker} </div>
 		);
 	}
}

class ByteOffset extends Component {
 	render() {
 		let offsets = [];
    	const step = this.props.width / 8;  // bytes per line

	    for (let i=0; i<this.props.size; i+=step) {
	    	const labelLow  = ("00" + (i).toString(16)).substr(-2).toUpperCase();
	    	const labelHigh = ("00" + (i + step - 1).toString(16)).substr(-2).toUpperCase();
	    	offsets.push(<div key={i}>{labelHigh}-{labelLow}H</div>);
	    }

    	return (
    		<div className="byte-offset"> {offsets} </div>
    	);
	}
}

export class RegContainer extends Component {
	render() {
		return (
			<div className="reg-container">
				<BitPosMarker width={this.props.width} />
				<ByteOffset width={this.props.width} size={this.props.size} />
				<div className="field-container"> {this.props.children} </div>
			</div>
		);
	}
}