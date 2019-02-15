import React, { Component } from 'react';

//------------------------------------------------------------
class AddBlockForm extends Component {
  constructor(props) {
    super(props);
    this.nameRef = React.createRef();
    this.baseRef = React.createRef();
  }
  
  cancelEditing() {
    this.props.dispatch({
      type: 'SET_SCENE',
      scene: 'empty'
    });
  }

  doneEditing() {
    this.props.dispatch({
      type: 'ADD_BLOCK',
      name: this.nameRef.current.value,
      base: this.baseRef.current.value,
    });
    
    this.props.dispatch({
      type: 'SET_SCENE',
      scene: 'empty'
    });
  }
  
  render() {
    return(
      <div>
        <label>
          Name:
          <input type="text" name="name" ref={this.nameRef}/>
        </label>
        <label>
          Base:
          <input type="text" name="base" ref={this.baseRef}/>
        </label>
        <button id="cancel" onClick={this.cancelEditing.bind(this)}>Cancel</button>
        <button id="done"   onClick={this.doneEditing.bind(this)}>Done</button>
      </div>
    );
  }
}

export default AddBlockForm;
