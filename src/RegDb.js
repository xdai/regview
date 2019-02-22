import React from 'react';
import { openDb } from 'idb';
import { splitKey } from './components/Utils';

export const RegContext = React.createContext();

class RegDb {
	constructor(setDbBusy) {
		if (!window.indexedDB) {
    		window.alert("Your browser doesn't support a stable version of IndexedDB.");
    		return;
		}

		this.dbPromise = openDb('NnRegView', 1, upgradeDb => {
			if (!upgradeDb.objectStoreNames.contains('store')) {
		    	const store = upgradeDb.createObjectStore('store');
		    	store.createIndex("parent", "parent", {unique: false});
    		}
		});
		
		this.data = undefined;
		this.setDbBusy = setDbBusy;
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

	getChildren = (key) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readonly');
			let store = tx.objectStore('store');
			let index = store.index('parent');
			return index.getAll(key);
		}).then(val => {
			this.setDbBusy(false);
			val.sort((a, b) => {
				return (parseInt(a.offset, 16) - parseInt(b.offset, 16));
			});
			return val;
		});
	}

	delete = (key) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readwrite');
			let store = tx.objectStore('store');
			return store.delete(key);
		});
	}

	import = (str) => {
		return this.open().then(db => {
			let tx = db.transaction('store', 'readwrite');
			let store = tx.objectStore('store');

			const json = JSON.parse(str);

			json.group.forEach(g => store.add(g, (g.parent || '') + g.name));
			json.register.forEach(r => store.add(r, r.parent + r.name));

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

	// Load and cache DB content, populate array of children's key.
	load = async () => {
		if (this.data) {
			return this.data;
		}
		
		const db = await this.dbPromise;
		const tx = db.transaction('store', 'readonly');
		const store = tx.objectStore('store');
		const data = await store.getAll();
		
		this.data = data.reduce((prev, curr) => {
			const key = (curr.parent || "") + curr.name;
			if (prev[key]) {
				prev[key].node = curr;
			}
			else {
				prev[key] = {
					node: curr,
					children: []
				};
			}
			if (curr.parent) {
				if (prev[curr.parent]) {
					prev[curr.parent].children.push(key);
				}
				else {
					prev[curr.parent] = {
						children: [key]
					};
				}
			}
			return prev;
		}, []);
		
		return this.data;
	}

	get = async (key) => {
		const data = await this.load();
		return data[key];
	}

	set = async (key, props) => {
		let entry = await this.get(key);
		let data = entry.node;

		for (let name in props) {
			if (props.hasOwnProperty(name)) {
				data[name] = props[name];
			}
		}

		const newKey = (data.parent || '') + data.name;
		
		const db = await this.dbPromise;
		const tx = db.transaction('store', 'readwrite');
		const store = tx.objectStore('store');
		
		if (key === newKey) {
			// Update DB: commit the entry
			await store.put(data, key);
		} else {
			const [srcParentKey] = splitKey(key);
			const [dstParentKey] = splitKey(newKey);

			// Update DB: delete the old entry
			await store.delete(key);

			// Update DB: commit the new entry under newkey
			await store.put(data, newKey);

			// Update cache: delete the old entry
			this.data.splice(this.data.indexOf(key), 1);
			
			// Update cache: insert the new entry under newKey
			this.data[newKey] = entry;

			// Updata cache: detach the entry from original parent
			let srcParent = await this.get(srcParentKey);
			srcParent.children.splice(srcParent.children.indexOf(key), 1);

			// Update cache: attach the entry to new parent
			let dstParent = await this.get(dstParentKey); // FIXME: dstParent doest exist?
			dstParent.children.push(newKey); // FIXME: duplicated name?

			// Recursion: re-attach all children to newKey
			// make a copy, as original array is going to be modified
			const tmp = entry.children.slice(0);
			for (let i = 0; i < tmp.length; i++) {
				const childKey = tmp[i];
				await this.set(childKey, {
					parent: newKey
				});
			}
		} 

		return tx.complete;
	}
}

export default RegDb;