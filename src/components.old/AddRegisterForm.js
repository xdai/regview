import React, { Component } from 'react';
import MessageBanner from './MessageBanner';
import FieldEditor from './FieldEditor'

class AddRegisterForm extends Component {
	constructor(props) {
		super(props);
    this.state = {
      isInputValid: true,
      showWarn: false,
      errorMessage: "",
      width: 0
    }
	}

  onWidthChange = (e) => {
    const target = e.target;
    const value  = target.value;
    if (parseInt(value, 10) > 64) {
      this.setState({
        isInputValid: false,
        showWarn: true,
        errorMessage: "Register cannot be more than 64 bytes long"
      })
    } else {
      this.setState({
        showWarn: false,
        width: parseInt(value, 10)
      })
    }
  };

  onDismiseWarning = () => {
    this.setState({
      showWarn: false
    })
  }

	render() {
		return (
      <form>
        {
          this.state.showWarn && 
          <MessageBanner 
            type="warn" 
            message={this.state.errorMessage} 
            onClose={this.onDismiseWarning} 
          />
        }
        <label>Name <input type="text" required/></label>
        <label>Offset <input type="text" required/></label>
        <label>Width <input type="number" min="1" max="64" required onChange={this.onWidthChange}/> bytes</label>
        <button>submit</button>

        {
          this.state.width > 0 &&
          <FieldEditor totalBits={this.state.width * 8} width="32"/>
        }
      </form>
		);
	}
}

export default AddRegisterForm;
