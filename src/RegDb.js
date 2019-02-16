import React from 'react';
import { openDb } from 'idb';

export const RegContext = React.createContext();

class RegDb {
	constructor(setDbBusy) {
		if (!window.indexedDB) {
    		window.alert("Your browser doesn't support a stable version of IndexedDB.");
    		return;
		}

		this.setDbBusy = setDbBusy;
		this.import = this.import.bind(this);
		this.export = this.export.bind(this);
	}

	open = () => {
		this.setDbBusy(true);

		return openDb('NnRegView', 1, upgradeDb => {
			if (!upgradeDb.objectStoreNames.contains('store')) {
		    	let store = upgradeDb.createObjectStore('store');
		    	store.createIndex("parent", "parent", {unique: false});
    		}
		});
	}

	count = () => {
		return this.open().then(db=> {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store')

			return store.count();
		})
	}

	get = (key) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store');
			return store.get(key);
		}).then(val => {
			this.setDbBusy(false);
			return val;
		});
	}

	getChildren = (key) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store');
			let index = store.index('parent');
			return index.getAll(key);
		}).then(val => {
			this.setDbBusy(false);
			// let children = {'group': [], 'register': []};
			// val.forEach(v => {
			// 	if (v.name.endsWith('/')) {
			// 		children.group.push(v);
			// 	} else {
			// 		children.register.push(v);
			// 	}
			// });
			// return children;
			val.sort((a, b) => {
				return (parseInt(a.offset, 16) - parseInt(b.offset, 16));
			});
			return val;
		});
	}

	put = (value) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readwrite');
			let store = tx.objectStore('store');
			return store.put(value, value.parent + value.name);
		}).then(() => {
			this.setDbBusy(false);
		});
	}

	delete = (key) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readwrite');
			let store = tx.objectStore('store');
			return store.delete(key);
		});
	}

	import = (obj) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readwrite');
			let store = tx.objectStore('store')

			obj.group.forEach(g => store.add(g, g.parent + g.name));
			obj.register.forEach(r => store.add(r, r.parent + r.name));

			return tx.complete.then(()=> {
				this.setDbBusy(false);
			});
		});
	}

	export = (path) => {
		let group = [];
		let register = [];

		this.open().then(db => {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store');
			return store.openCursor();
		}).then(function checkItems(cursor) {
			if (!cursor) {
				return;
			}
			if (cursor.key.startsWith(path)) {
				if (cursor.key.endsWith('/')) {
					group.push(cursor.value);
				} else {
					register.push(cursor.value);
				}
			} else if (path.startsWith(cursor.key)) {
				group.push(cursor.value);
			} else {
				// ignore
			}
			return cursor.continue().then(checkItems);
		}).then(() => {
			// let filename = path.split('/');
			// if (path.endsWith('/')) {
			// 	filename = filename[filename.length - 2] + '.json';
			// } else {
			// 	filename = filename[filename.length - 1] + '.json';
			// }
			// self.saveAs({'group': group, 'register': register}, filename);
			return {'group': group, 'register': register};
		});
	}

	saveAs = (obj, filename) => {
	    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
	    var downloadAnchorNode = document.createElement('a');
	    downloadAnchorNode.setAttribute("href",     dataStr);
	    downloadAnchorNode.setAttribute("download", filename);
	    document.body.appendChild(downloadAnchorNode); // required for firefox
	    downloadAnchorNode.click();
	    downloadAnchorNode.remove();
	}
}

export default RegDb;