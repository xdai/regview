import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';

import { HashRouter as Router } from "react-router-dom";

import Regview from './components/Regview';
import './index.css';

/* Font Awesome */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faAngleRight, faAngleDown, faAngleDoubleDown, faPlus, faMinus, faTimes} from '@fortawesome/free-solid-svg-icons'
library.add(faAngleRight, faAngleDown, faAngleDoubleDown, faPlus, faMinus, faTimes);

// React Entry
ReactDOM.render(
	<Router><Regview /></Router>,
	document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
