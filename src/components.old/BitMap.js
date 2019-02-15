import React, { Component } from 'react';

/*
 * Props:
 *   - totalBits: total bits of this register
 *   - width: bit count per line
 *   - fields: array of field definition
 */
class BitMap extends Component {
  render() {
    console.log(this.props.totalBits);
    return (
      <div className="bit-map">
        <BitPosMarker width={this.props.width} />
        <FieldTable {...this.props} />
        <ByteOffset width={this.props.width} totalBits={this.props.totalBits} />
      </div>
    );
  }
}

class BitPosMarker extends Component {
  render() {
    let marker = [];

    for (let i=this.props.width-1; i>=0; i--) {
      marker.push(
        <div key={i} className="bit-pos-indicator">
          {i}
        </div>
      );
    }
    
    return (
      <div className="bit-pos-marker">
        {marker}
      </div>
    );
  }
}

class FieldTable extends Component {
  render() {
    let pos = 0;
    let fields = [];

    this.props.fields.forEach((field) => {
      const low  = field.bits[0];
      const high = field.bits[1];
      
      if (pos < low) {
        fields.push(
          <UnusedField 
            key={pos}
            low={pos} high={low - 1}
            width={this.props.width}
          />
        );
      }

      fields.push(<Field key={low} {...field} width={this.props.width}/>);

      pos = high + 1;
    });

    if (pos < this.props.totalBits - 1) {
      console.log([pos, this.props.totalBits])
      fields.push(
        <UnusedField 
          key={pos}
          low={pos} high={this.props.totalBits-1} 
          width={this.props.width}
        />
      );
    }

    return (
      <div className="field-table"> {fields} </div>
    );
  }
}

class ByteOffset extends Component {
  render() {
    let offsets = [];
    const step = this.props.width / 8;  // bytes per line

    for (let i=0; i<this.props.totalBits; i+=this.props.width) {
      const labelLow  = ("00" + (i/8).toString(16)).substr(-2).toUpperCase();
      const labelHigh = ("00" + (i/8 + step - 1).toString(16)).substr(-2).toUpperCase();
      offsets.push(<div key={i}>{labelHigh}-{labelLow}H</div>);
    }

    return (
      <div className="byte-offset"> {offsets} </div>
    );
  }
}

class UnusedField extends Component {
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

class Field extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showValue: false
    };
  }

  render() {
    let fragments = [];
    let bits = this.props.bits.slice(0);
    let roundUp = (p,w) => ((Math.floor(p / w) + 1) * w - 1);

    while (bits.length) {
      let low  = bits.shift();
      let high = bits.shift();

      while(low <= high) {
        const pos = Math.min(high, roundUp(low, this.props.width));
        const row = Math.floor(low / this.props.width) + 1;
        const col = this.props.width - pos % this.props.width
        const width = pos - low + 1;
        fragments.push(
          <FieldFragment key={pos} name={this.props.name} row={row} col={col} width={width} valid={true}/>
        );
        low = pos + 1;
      }
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
  constructor(props) {
    super(props);
    this.state = {
      renderMode: "desc",
      value: 0xaa
    };
  }

  toggleMode() {
    this.setState({
      renderMode: "value"
    });
  }
  
  renderDesc() {
    const fragStyle = {
      gridRow: this.props.row,
      gridColumnStart: this.props.col,
      gridColumnEnd: this.props.col + this.props.width,
    };
    return (
      <div className={this.props.valid ? "field-fragment" : "field-fragment-unused"} style={fragStyle}>
        {this.props.name}
      </div>
    );
  }

  renderValue() {
    const bits = [];

    if (this.props.valid) {
      for (let i=0; i<=this.props.high - this.props.low; i++) {
        bits.push(<Bit key={i} value={(this.state.value >> i) & 1}/>);
      }
    }

    const fragStyle = {
      gridRow: this.row,
      gridColumnStart: this.col,
      gridColumnEnd: this.col + this.props.high - this.props.low + 1,
      display: "grid",
      gridTemplateColumns: "repeat(" + (this.props.high - this.props.low + 1) + ", 1fr)",
      backgroundColor: this.props.valid ? "white" : "#999999"
    };

    return (
      <div className="field-fragment" style={fragStyle} name="foobar" onMouseOver={this.toggleMode.bind(this)}>
        {bits.reverse()}
      </div>
    );
  }

  render() {
    switch (this.state.renderMode) {
    case "desc":
      return this.renderDesc();
    case "value":
      return this.renderValue();
    default:
      return this.renderDesc();
    }
  }
}

class Bit extends Component {
  render() {
    return (
      <div className="bit">{this.props.value}</div>
    );
  }
}

export default BitMap;