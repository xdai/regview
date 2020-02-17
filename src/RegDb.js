import { openDB } from 'idb';

class RegDb {
	constructor() {
		if (!window.indexedDB) {
    		window.alert("Your browser doesn't support a stable version of IndexedDB.");
    		return;
		}

		this.observers = {
			add: [],
			update: [],
			delete: [],
			import: [],
		};

		this.dbName    = "NnRegView";
		this.storeName = "store";

		this.dbPromise = openDB(
			this.dbName, 
			1, 
			{
				upgrade(db) {
					if (!db.objectStoreNames.contains("store")) {
						const store = db.createObjectStore("store");
						store.createIndex("parent", "parent", {unique: false});
					}
				}
			}
		);
	}

	subscribe = (f, type) => {
		if (type && this.observers[type]) {
			this.observers[type].push(f);
		} else {
			Object.keys(this.observers).forEach(key => this.observers[key].push(f));
		}

		return this;
	}

	unsubscribe = (f, type) => {
		const _unsubscribe = (_f, _t) => {
			this.observers[_t] = this.observers[_t].filter(subscriber => subscriber !== _f);
		}
		if (type && this.observers[type]) {
			_unsubscribe(f, type);
		} else {
			Object.keys(this.observers).forEach(key => _unsubscribe(f, key));
		}

		return this;
	}

	notify = (data) => {
		this.observers[data.type].forEach(f => f(data));
	}

	import = async (str) => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName, 'readwrite');
		const allKeys = await tx.store.getAllKeys();
		const data = JSON.parse(str).filter(entry => entry.name !== "/");

		// error if the entry is exist
		data.forEach(entry => {
			const key = (entry.parent || '') + entry.name;
			if (allKeys.includes(key)) {
				throw new KeyExistError(key);
			}
			tx.store.add(entry, key);
		});

		await tx.done;

		this.notify({
			type: "import",
			data: data,
		});
	}

	export = async (topKey) => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName);

		const allKeys = (await tx.store.getAllKeys()).filter(
			key => key.startsWith(topKey) || topKey.startsWith(key)
		).sort();

		const data = [];
		for (const key of allKeys) {
			data.push(await tx.store.get(key));
		}

		return data;
	}

	// Count the number of entries in DB
	count = async () => {
		const db = await this.dbPromise;
		const n = await db.count(this.storeName);
		return n;
	}

	getAllKeys = async () => {
		const db = await this.dbPromise;
		const keys = await db.getAllKeys(this.storeName);
		return keys;
	}

	getChildren = async (key) => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName, 'readonly');
		const index = tx.store.index('parent');
		const val = await index.getAll(key);

		val.sort((a, b) => {
			return parseInt(a.offset, 16) - parseInt(b.offset, 16);
		});
		return val;
	}

	getHierarchy = async () => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName);
		const idx = tx.store.index("parent");
		
		const _getHierarchy = async (key, name) => {
			const nodes = await idx.getAll(key);
			nodes.sort((a, b) => {
				return parseInt(a.offset, 16) - parseInt(b.offset, 16);
			});

			const children = [];

			for (const node of nodes) {
				const childKey = node.parent + node.name;
				const subTree = await _getHierarchy(childKey, node.name);
				children.push(subTree);
			}

			return {name, children};
		}

		const hierarchy = await _getHierarchy("/");
		return hierarchy.children;
	}
	
	get = async (key) => {
		const db = await this.dbPromise;
		const val = await db.get(this.storeName, key);
		return val;
	}
	
	// Add new entry to DB
	add = async (data) => {
		const key = data.parent + data.name;
		const db = await this.dbPromise;
		//await db.add(this.storeName, data, key);
		const tx = db.transaction(this.storeName, 'readwrite');
		if(await tx.store.getKey(key)) {
			throw new KeyExistError(key);
		}
		tx.store.add(data, key);
		await tx.done;

		this.notify({
			type: "add",
			data: data,
		});
	}

	// Updata (i.e. shallow merge) props of an entry
	set = async (key, props) => {
		if (key === '/') {
			throw Error(`Root entry is readonly`);
		}
		
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName, 'readwrite');
		
		const value = await tx.store.get(key);
		const newValue = {...value, ...props};
		const newKey = newValue.parent + newValue.name;

		
		if (key === newKey) { // no key change
			tx.store.put(newValue, key);
		} else { // needs to move all decendants
			if (newKey.startsWith(key)) {
				throw Error(`You cannot rename ${key} to ${newKey}`);
			}
			if(await tx.store.getKey(newKey)) {
				throw new KeyExistError(newKey);
			}
			tx.store.delete(key);
			tx.store.add(newValue, newKey);

			// Iterate the DB, update `key` and `parent` of all descendants.
			// FIXME: This might be expensive. Consider changing DB schema.
			if (newKey.endsWith("/")) {
				let cursor = await tx.store.openCursor();
				while (cursor) {
					if (cursor.key.startsWith(key)) {
						tx.store.add({
							...cursor.value,
							parent: cursor.value.parent.replace(key, newKey)
						}, cursor.key.replace(key, newKey));
						cursor.delete();
					}
					cursor = await cursor.continue();
				}
			}
		}		
		
		await tx.done;

		this.notify({
			type: "update",
			oldData: value,
			newData: newValue,
		});
	}
	
	// Delete all entries under `key` (inclusive)
	delete = async (key) => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName, 'readwrite');
		
		const deletedKeys = [];
		let cursor = await tx.store.openCursor();
		while (cursor) {
			if (cursor.key.startsWith(key)) {
				deletedKeys.push(cursor.key);
				await cursor.delete();
			}
			cursor = await cursor.continue();
		}

		await tx.done;

		this.notify({
			type: "delete",
			deletedKeys: deletedKeys,
		});
	}

	// Delete everything except the root (i.e. '/').
	reset = async () => {
		const db = await this.dbPromise;
		const tx = db.transaction(this.storeName, 'readwrite');
		tx.store.clear();
		tx.store.add({name: '/', offset: '0'}, '/');
		await tx.done;
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

export class KeyExistError extends Error {
	constructor(message) {
	  super(message);
	  this.name = 'KeyExist';
	}
}

export class DbEmptyError extends Error {
	constructor(message) {
	  super(message);
	  this.name = 'DbEmpty';
	}
}

const regDb = new RegDb();

export default regDb;
