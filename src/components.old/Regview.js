import React, { Component } from 'react';
import Navigator from './Navigator';
import './Regview.css'

//------------------------------------------------------------
class Regview extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      isDataSourceSelected: false,
      scene: 'none',
      data: []
    };

    this.fileRef = React.createRef();
  }

  importData(e) {
    const file = this.fileRef.current.files[0];

    if (file.type.match(/application\/json/)) {
      let reader = new FileReader();
      
      reader.onload = (e) => {
        this.setState({
          isDataSourceSelected: true,
          data: JSON.parse(reader.result).data
        });
      };

      reader.readAsText(file);
    }
  }

  render() {
    const chooseDataSource = 
      <div id="dataSource">
        <label><input type="file" ref={this.fileRef} onChange={this.importData.bind(this)}/>Import from JSON</label>
        <p onClick={() => this.setState({isDataSourceSelected: true})}>Start Fresh</p>
      </div>;

    const content = 
      <Navigator 
        blocks={this.state.data} 
      />
    
    return (
      this.state.isDataSourceSelected ? content : chooseDataSource
    );
  }
}

export default Regview;
