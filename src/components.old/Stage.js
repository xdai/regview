import React, { Component } from 'react';
import AddBlockForm from './AddBlockForm';
import AddRegisterForm from './AddRegisterForm';

//------------------------------------------------------------
class Stage extends Component {
  render() {
    var scene;
    if (this.props.scene === "addBlock") {
      scene = <AddBlockForm changeScene={this.props.changeScene} addNewBlock={this.props.addNewBlock}/>
    } else if (this.props.scene === "addRegister") {
      scene = <AddRegisterForm changeScene={this.props.changeScene} addNewRegister={this.props.addNewRegister}/>
    } else {
      scene = 'Empty';
    }

    return (
      <div id="stage">
        {scene}
      </div>
    );
  }
}

export default Stage;
