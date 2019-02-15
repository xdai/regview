import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import BitMap from './BitMap';

class Register extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDetails: false
    };
  }

  toggleDetail = () => {
    this.setState((preState) =>({
      showDetails: !preState.showDetails
    }));
  }

  render() {
    let reg = this.props.data;
    const base    = parseInt(this.props.base, 16);
    const offset  = parseInt(reg.offset, 16);
    const address = base + offset;
    const addrStr = "0x" + ("00000000" + address.toString(16)).toUpperCase().substr(-8);

    return (
      <div className="register">
        <div className="register-header" onClick={this.toggleDetail}>
          <div className="fa">
            <span>
              <FontAwesomeIcon 
                icon={this.state.showDetails ? "angle-down" : "angle-right"}
              />
            </span>
          </div>
          <span className="register-address">{addrStr}</span>
          <span className="register-offset">{"(+0x" + reg.offset.substr(2).toUpperCase() + ")"}</span>
          <div>
            <span className="register-name">{reg.name}</span>
            <span className="register-desc-short">{reg.desc_short}</span>
          </div>
        </div>
        {
          this.state.showDetails && (
            <div className="register-detail">
              <p className="register-desc">
                {reg.desc_long}
              </p>
              <BitMap
                width={32}
                totalBits={reg.width}
                fields={reg.fields}
              />
            </div>
          )
        }
      </div>
    );
  }
}
export default Register;
