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

			json.forEach(g => store.add(g, (g.parent || '') + g.name));
			//json.register.forEach(r => store.add(r, r.parent + r.name));

			return tx.complete.then(()=> {
				this.setDbBusy(false);
			});
		});
	}

	// Export the hierarchy:
	//   - all ancestors
	//   - key itself
	//   - all children
	export = async (key) => {
		const data = await this.load();

		let shouldInclude = (keyA, keyB) => keyA.startsWith(keyB) || keyB.startsWith(keyA);

		let result = [];
		for (let elmKey in data) {
			if (shouldInclude(elmKey, key)) {
				result[elmKey] = {
					node: data[elmKey].node,
					children: data[elmKey].children.filter((child) => shouldInclude(child, key))
				};
			}
		}

		return result;
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
		if (data.hasOwnProperty(key)) {
			return data[key];
		} else {
			throw Error(`Entry ${key} doesn't exist`);
		}
	}

	add = async (data) => {
		const key = data.parent + data.name;

		// Check if the key is already exist
		let exist = true;
		try {
			await this.get(key);
		} catch(error) {
			exist = false;
		}

		if (exist) {
			throw Error(`Entry ${key} already exist`);
		}

		// Update cache: add entry
		this.data[key] = {
			node: data,
			children: []
		};

		// Update cache: attache to parent
		this.data[data.parent].children.push(key);

		// Update DB: commit the entry
		const db = await this.dbPromise;
		const tx = db.transaction('store', 'readwrite');
		const store = tx.objectStore('store');
		store.put(data, key);

		return tx.complete;
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