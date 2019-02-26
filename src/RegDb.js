import React from 'react';
import { openDb } from 'idb';
import { splitKey } from './components/Utils';

export const RegContext = React.createContext();

let dbCache = undefined;

class RegDb {
	constructor() {
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
	}

	import = async (str, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}
		const store = tx.objectStore('store');

		// error if the entry is exist
		JSON.parse(str).forEach(
			entry => store.add(entry, (entry.parent || '') + entry.name)
		);

		this.reload(tx);

		return tx.complete;
	}

	// Count the number of entries in DB
	count = async () => {
		const db = await this.dbPromise;
		const tx = db.transaction('store', 'readonly');
		const store = tx.objectStore('store');

		return store.count();
	}

	// Load, parse and cache DB content
	load = async (transaction) => {
		if (dbCache) {
			return dbCache;
		}
		
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}
		const store = tx.objectStore('store');
		
		const rawData = await store.getAll();
		
		dbCache = this.parse(rawData);
		
		return dbCache;
	}

	// Force reload of the DB content
	reload = async (transaction) => {
		dbCache = undefined;
		return this.load(transaction);
	}

	getChildren = async (key) => {
		const db = await this.dbPromise;
		const tx = db.transaction('store', 'readwrite');
		const store = tx.objectStore('store');
		const index = store.index('parent');
		const val = await index.getAll(key);
		
		this.setDbBusy(false);
		
		val.sort((a, b) => {
			return parseInt(a.offset, 16) - parseInt(b.offset, 16);
		});
		return val;
	}
	
	get = async (key, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}

		const data = await this.load(tx);
		if (data.hasOwnProperty(key)) {
			return data[key];
		} else {
			throw Error(`Entry ${key} doesn't exist`);
		}
	}

	loadWithFilter = async (filter, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}

		const data = await this.load(tx);

		let result = [];
		for (let elmKey in data) {
			if (data.hasOwnProperty(elmKey) && filter(data[elmKey])) {
				result[elmKey] = {
					node: data[elmKey].node,
					address: data[elmKey].address,
					children: data[elmKey].children
				};
			}
		}

		for (let elmKey in result) {
			result[elmKey].children = result[elmKey].children.filter(
				childKey => result.hasOwnProperty(childKey)
			).sort((keyA, keyB) => 
				result[keyA].address - result[keyB].address
			);
		}

		return result;
	}

	getSubTree = async (key, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}

		const tree = await this.loadWithFilter((entry) => {
			const entryKey = (entry.node.parent || '') + entry.node.name;
			return entryKey.startsWith(key);
		}, tx);

		if (!tree.hasOwnProperty(key)) {
			throw Error(`Entry ${key} doesn't exist`);
		}

		return tree;
	}

	getHierarchy = async (key, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}

		const hierarchy = await this.loadWithFilter((entry) => {
			const entryKey = (entry.node.parent || '') + entry.node.name;
			return entryKey.startsWith(key) || key.startsWith(entryKey);
		}, tx);

		if (!hierarchy.hasOwnProperty(key)) {
			throw Error(`Entry ${key} doesn't exist`);
		}

		return hierarchy;
	}
	
	// Add new entry to DB, handle cache coherency and data integrity
	add = async (data, transaction) => {
		const key = data.parent + data.name;

		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}
		const store = tx.objectStore('store');

		// Check if the key is already exist
		let exist = true;
		try {
			await this.get(key, tx);
		} catch(error) {
			exist = false;
		}

		if (exist) {
			throw Error(`Entry ${key} already exist`);
		}
		
		// Update cache: attache to parent
		const parent = dbCache[data.parent];
		parent.children.push(key);

		// Update cache: add entry
		dbCache[key] = {
			node: data,
			address: parent.address + parseInt(data.offset, 16),
			children: []
		};

		// Update DB: commit the entry
		store.add(data, key);

		return tx.complete;
	}

	// Updata props of an entry, handle cache coherency and data integrity
	set = async (key, props, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}
		const store = tx.objectStore('store');

		let entry = await this.get(key, tx);

		// Find the new key
		const newParent = props.parent || entry.node.parent;
		const newName = props.name || entry.node.name;
		const newKey = (newParent || '') + newName;

		// New parent must exist
		if (newParent && !dbCache.hasOwnProperty(newParent)) {
			throw Error(`Entry ${newParent} doesn't exist`);
		}

		// Cannot override an existing entry
		if (newKey !== key && dbCache.hasOwnProperty(newKey)) {
			throw Error(`Entry ${newKey} already exist`);
		}

		// Update the entry, ignore the key change
		const update = async (entry, props) => {
			const node = entry.node;
			const key  = (node.parent || '') + node.name;
			
			for (let name in props) {
				if (props.hasOwnProperty(name) && name !== 'parent' && name !== 'name') {
					node[name] = props[name];
				}
			}

			return store.put(node, key);
		}

		// Apply the key change only
		const move = async (entry, dstKey) => {
			const srcKey = entry.node.parent + entry.node.name;
			const [dstParentKey, dstName] = splitKey(dstKey);
			
			const srcParent = await this.get(entry.node.parent, tx);
			const dstParent = await this.get(dstParentKey, tx);

			entry.node.parent = dstParentKey;
			entry.node.name   = dstName;

			// Update DB: delete the old entry
			await store.delete(srcKey);

			// Update DB: commit the new entry under new key
			await store.put(entry.node, dstKey);

			// Update cache: delete the old entry
			dbCache.splice(dbCache.indexOf(srcKey), 1);

			// Update cache: insert the entry under new key
			dbCache[dstKey] = entry;

			// Updata cached hierarchy: detach the entry from original parent
			srcParent.children.splice(srcParent.children.indexOf(srcKey), 1);

			// Update cached hierarchy: attach the entry to new parent
			dstParent.children.push(dstKey);

			// Recursion: re-attach all children to newKey
			// make a copy, as original array is going to be modified
			console.log(entry);
			const tmp = entry.children.slice(0);
			for (let i = 0; i < tmp.length; i++) {
				const childKey = tmp[i];
				const childEntry = await this.get(childKey, tx);
				const newKey = dstKey + childEntry.node.name;
				await move(childEntry, newKey);
			}
		}

		await update(entry, props);

		if (key !== newKey) {
			await move(entry, newKey);
		}

		// Apply address offset introduced by the change
		const applyOffset = (root, offset) => {
			if (!offset) {
				return;
			}
			root.address += offset;
			root.children.forEach(childKey => {
				applyOffset(dbCache[childKey]);
			});
		};
		if (props.offset) {
			applyOffset(entry, parseInt(props.offset, 16) - parseInt(entry.node.offset, 16));
		}

		return tx.complete;
	}
	
	// Recursively delete all entries under `key` (inclusive)
	delete = async (key, transaction) => {
		let tx = transaction;
		if (!tx) {
			const db = await this.dbPromise;
			tx = db.transaction('store', 'readwrite');
		}
		const store = tx.objectStore('store');

		const entry = await this.get(key, tx);
		const parent = await this.get(entry.node.parent, tx);

		let _delete = async (root) => {
			for (let i = 0; i < root.children.length; i++) {
				const child = await this.get(root.children[i], tx);
				await _delete(child);
			}

			await store.delete(key);
			dbCache.splice(dbCache.indexOf(key), 1);
		}
		
		await _delete(entry);

		parent.children.splice(parent.children.indexOf(key), 1);
		
		return tx.complete;
	}

	parse = (rawData) => {
		const data = rawData.reduce((prev, curr) => {
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

		const parseAddress = (root, base = 0) => {
			root['address'] = base + parseInt(root.node.offset, 16);
			root['children'].forEach(childKey => {
				parseAddress(data[childKey], root['address']);
			});
		};

		parseAddress(data['/']);

		return data;
	}
}

export default RegDb;

export let regDb = new RegDb();
