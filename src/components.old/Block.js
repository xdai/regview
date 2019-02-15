import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Register from './Register';
import AddRegisterForm from './AddRegisterForm'

//------------------------------------------------------------
class Block extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showRegisters: false,
      showForm: false
    };
  }

  toggleRegisters = () => {
    this.setState((prevState, props) => ({
      showRegisters: !prevState.showRegisters
    }));
  }

  toggleForm = (e) => {
    this.setState((prevState, props) => ({
      showForm: !prevState.showForm
    }));

    e.stopPropagation();
  }
  
  render() {
    const registers = [];

    if (this.state.showRegisters) {
      this.props.data.registers.forEach((register) => {
        registers.push(
          <Register key={register.offset} data={register} base={this.props.data.base} />
        );
      });
    }

    let angleIcon;
    if (this.state.showRegisters && this.state.showForm) {
      angleIcon = "angle-double-down";
    } else if (this.state.showRegisters || this.state.showForm) {
      angleIcon = "angle-down";
    } else {
      angleIcon = "angle-right";
    }

    return (
      <div className="block">
        <div className="block-header" onClick={this.toggleRegisters}>
          <div className="fa">
            <span>
              <FontAwesomeIcon icon={angleIcon} />
            </span>
          </div>
          <div className="desc">{this.props.data.base}</div>
          <div className="desc">{this.props.data.name}</div>
          <div className="add fa" onClick={this.toggleForm}>
            <span>
              <FontAwesomeIcon icon={this.state.showForm ? "minus" : "plus"}/>
            </span>
          </div>
        </div>
        {this.state.showForm && <AddRegisterForm/>}
        {registers}
      </div>
    );
  }
}

export default Block;
