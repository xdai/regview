import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

class MessageBanner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDisplayed: true
    };
  }

  hideBanner = () => {
    this.setState((prevState) => ({
      isDisplayed: !prevState.isDisplayed
    }));
  }
  
  render() {
    if (!this.state.isDisplayed) {
      return null;
    }

    return (
      <div className={"message-banner message-banner-" + this.props.type}>
        <span class="message-banner-text">
          {this.props.message}
        </span>
        <div className="fa s-clickable" onClick={this.props.onClose}>
            <span>
              <FontAwesomeIcon icon="times"/>
            </span>
          </div>
      </div>
    );
  }
}

export default MessageBanner;