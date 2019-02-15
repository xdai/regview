import React, { Component } from 'react';
import Block from './Block';

//------------------------------------------------------------
class Navigator extends Component {
  
  render() {
    const blocks = [];

    this.props.blocks.forEach((block) => {
      blocks.push(<Block key={block.name} data={block}/>);
    })

    return (
      <div id="navigator">
        {blocks}
      </div>
    );
  }
}

export default Navigator;
