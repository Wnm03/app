'use strict';
/**
 * tests/helpers/fakeIndexedDB.js — minimal deterministic in-memory
 * IndexedDB test double, dibuat khusus untuk tests/ride-storage.test.js
 * (S524, "Ride Storage & Recovery Foundation").
 *
 * KENAPA FILE INI ADA:
 *   - Repo tidak punya real-IndexedDB test double (test IndexedDB yang ada,
 *     mis. tests/vehicle-catalog.test.js/tests/honda-pdf-import.test.js,
 *     memock di level IDBStore.get/set — bukan indexedDB API asli), dan
 *     Node tidak punya indexedDB built-in.
 *   - S524 hard scope MELARANG dependency baru (package.json/
 *     package-lock.json tidak boleh disentuh), jadi tidak ada polyfill
 *     (mis. fake-indexeddb dari npm) yang bisa dipakai.
 *   - modules/vehicle/ride-storage.js sendiri (production code) HARUS
 *     tetap memakai IndexedDB API asli apa adanya (bukan diubah supaya
 *     "gampang dites") — jadi test double inilah yang menyesuaikan diri
 *     ke API asli, bukan sebaliknya.
 *
 * BUKAN polyfill IndexedDB umum — hanya mengimplementasikan subset yang
 * benar-benar dipakai ride-storage.js:
 *   - indexedDB.open(name, version) + onupgradeneeded/onsuccess/onerror
 *   - db.createObjectStore(name, {keyPath, autoIncrement})
 *   - db.transaction(storeNames, mode) + tx.oncomplete/onerror/onabort/abort()
 *   - store.add/put/get/getAll/delete/clear (key TUNGGAL atau IDBKeyRange)
 *   - IDBKeyRange.bound(lower, upper)
 *   - Primary key gabungan (array keyPath, mis. ['rideId','sequence'])
 *     dgn urutan sort leksikografis per komponen (perilaku asli IndexedDB
 *     structured key comparison utk kasus sederhana angka/string di sini).
 *
 * Setiap `createFakeIndexedDB()` menghasilkan instance BARU & terisolasi
 * (map database sendiri) — dua test tidak saling bocor data kecuali
 * sengaja pakai instance yang sama (dipakai utk simulasi "reopen
 * database preserves data": load() dua kali dgn `indexedDB` fake yang
 * SAMA).
 */

function microtask(fn) {
  Promise.resolve().then(fn);
}

function isPlainArrayKeyPath(keyPath) {
  return Array.isArray(keyPath);
}

function extractKey(keyPath, value) {
  if (isPlainArrayKeyPath(keyPath)) {
    return keyPath.map((k) => value[k]);
  }
  return value[keyPath];
}

function compareSingle(a, b) {
  if (a === b) return 0;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// Bandingkan key (bisa primitif atau array/compound), gaya IndexedDB:
// komponen pertama dibandingkan dulu, baru komponen berikutnya kalau
// komponen sebelumnya sama (lexicographic).
function compareKeys(a, b) {
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr && bArr) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const c = compareSingle(a[i], b[i]);
      if (c !== 0) return c;
    }
    return compareSingle(a.length, b.length);
  }
  if (!aArr && !bArr) return compareSingle(a, b);
  // Campur array vs non-array tidak dipakai di ride-storage.js — anggap
  // tidak sama tanpa urutan spesifik (tidak relevan utk test suite ini).
  return aArr ? 1 : -1;
}

function isValidKey(key) {
  if (Array.isArray(key)) return key.every(isValidKey);
  return typeof key === 'string' || typeof key === 'number';
}

class FakeIDBKeyRange {
  constructor(lower, upper, lowerOpen, upperOpen) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = !!lowerOpen;
    this.upperOpen = !!upperOpen;
  }
  includes(key) {
    if (this.lower !== undefined) {
      const c = compareKeys(key, this.lower);
      if (c < 0 || (c === 0 && this.lowerOpen)) return false;
    }
    if (this.upper !== undefined) {
      const c = compareKeys(key, this.upper);
      if (c > 0 || (c === 0 && this.upperOpen)) return false;
    }
    return true;
  }
  static bound(lower, upper, lowerOpen, upperOpen) {
    return new FakeIDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }
  static only(value) {
    return new FakeIDBKeyRange(value, value, false, false);
  }
}

function isKeyRange(x) {
  return x instanceof FakeIDBKeyRange;
}

class FakeIDBRequest {
  constructor(source) {
    this.result = undefined;
    this.error = null;
    this.source = source || null;
    this.onsuccess = null;
    this.onerror = null;
  }
  _succeed(result) {
    this.result = result;
    microtask(() => {
      if (this.onsuccess) this.onsuccess({ target: this });
    });
  }
  _fail(error) {
    this.error = error;
    microtask(() => {
      if (this.onerror) this.onerror({ target: this });
    });
  }
}

class FakeIDBOpenDBRequest extends FakeIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
    this.onblocked = null;
  }
}

class FakeIDBObjectStore {
  constructor(rawStore, transaction) {
    this._raw = rawStore;
    this._tx = transaction;
  }
  get keyPath() {
    return this._raw.keyPath;
  }
  get autoIncrement() {
    return this._raw.autoIncrement;
  }
  add(value) {
    return this._tx._enqueue((cb) => {
      try {
        const key = this._computeKey(value, true);
        if (this._raw.records.has(_keyToStr(key))) {
          cb(null, new Error('ConstraintError: key already exists'));
          return;
        }
        this._raw.records.set(_keyToStr(key), { key, value });
        cb(key, null);
      } catch (e) {
        cb(null, e);
      }
    });
  }
  put(value) {
    return this._tx._enqueue((cb) => {
      try {
        const key = this._computeKey(value, false);
        this._raw.records.set(_keyToStr(key), { key, value });
        cb(key, null);
      } catch (e) {
        cb(null, e);
      }
    });
  }
  get(key) {
    return this._tx._enqueue((cb) => {
      const rec = this._raw.records.get(_keyToStr(key));
      cb(rec ? rec.value : undefined, null);
    });
  }
  getAll(query) {
    return this._tx._enqueue((cb) => {
      const out = [];
      const entries = [...this._raw.records.values()].sort((a, b) => compareKeys(a.key, b.key));
      for (const rec of entries) {
        if (query === undefined) {
          out.push(rec.value);
        } else if (isKeyRange(query)) {
          if (query.includes(rec.key)) out.push(rec.value);
        } else if (compareKeys(rec.key, query) === 0) {
          out.push(rec.value);
        }
      }
      cb(out, null);
    });
  }
  delete(keyOrRange) {
    return this._tx._enqueue((cb) => {
      if (isKeyRange(keyOrRange)) {
        for (const [strKey, rec] of [...this._raw.records.entries()]) {
          if (keyOrRange.includes(rec.key)) this._raw.records.delete(strKey);
        }
      } else {
        this._raw.records.delete(_keyToStr(keyOrRange));
      }
      cb(undefined, null);
    });
  }
  clear() {
    return this._tx._enqueue((cb) => {
      this._raw.records.clear();
      cb(undefined, null);
    });
  }
  _computeKey(value, isAdd) {
    if (this._raw.keyPath !== null && this._raw.keyPath !== undefined) {
      const key = extractKey(this._raw.keyPath, value);
      if (!isValidKey(key)) {
        throw new Error('DataError: invalid or missing key path value');
      }
      return key;
    }
    if (this._raw.autoIncrement) {
      this._raw.autoIncCounter += 1;
      return this._raw.autoIncCounter;
    }
    throw new Error('DataError: object store requires an explicit key');
  }
}

function _keyToStr(key) {
  return JSON.stringify(key);
}

class FakeIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this._storeNames = storeNames;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this._queue = [];
    this._aborted = false;
    this._finished = false;
    // Snapshot store state so an aborted transaction can roll back
    // cleanly (matches real IndexedDB readwrite-transaction semantics).
    this._snapshots = new Map();
    for (const name of storeNames) {
      const raw = db._stores.get(name);
      this._snapshots.set(name, {
        records: new Map(raw.records),
        autoIncCounter: raw.autoIncCounter,
      });
    }
    microtask(() => this._drain());
  }
  objectStore(name) {
    if (!this._storeNames.includes(name)) {
      throw new Error(`NotFoundError: object store "${name}" not in transaction scope`);
    }
    return new FakeIDBObjectStore(this.db._stores.get(name), this);
  }
  abort() {
    if (this._finished) return;
    this._rollback();
    this._finished = true;
    this._aborted = true;
    this.error = this.error || new Error('AbortError: transaction aborted');
    if (this.onabort) this.onabort({ target: this });
  }
  _rollback() {
    for (const [name, snap] of this._snapshots) {
      const raw = this.db._stores.get(name);
      raw.records = new Map(snap.records);
      raw.autoIncCounter = snap.autoIncCounter;
    }
  }
  _enqueue(op) {
    const req = new FakeIDBRequest();
    this._queue.push({ op, req });
    return req;
  }
  _drain() {
    if (this._finished) return;
    while (this._queue.length) {
      const { op, req } = this._queue.shift();
      if (this._aborted) continue;
      op((result, err) => {
        if (err) {
          this.error = err;
          req._fail(err);
          microtask(() => this.abort());
        } else {
          req._succeed(result);
        }
      });
    }
    // BUKAN microtask biasa: request yang di-enqueue dari DALAM callback
    // .then() sebuah request sebelumnya (pola get()-lalu-put() yg umum,
    // lihat updateRide() di ride-storage.js) baru sampai ke _enqueue()
    // BEBERAPA microtask setelah request pertama _succeed() (karena lewat
    // rantai Promise, bukan callback sinkron). Kalau "selesai apa belum"
    // dicek pakai microtask lagi di titik ini, queue masih kelihatan
    // kosong padahal request susulan itu BELUM sempat masuk -> transaction
    // dianggap `complete` prematur & request susulan itu nyangkut
    // selamanya. setImmediate (macrotask) memberi waktu SEMUA microtask
    // pending (termasuk rantai .then() itu) benar-benar habis dulu
    // sebelum transaction ini boleh dianggap selesai.
    setImmediate(() => this._maybeComplete());
  }
  _maybeComplete() {
    if (this._finished) return;
    if (this._queue.length) {
      microtask(() => this._drain());
      return;
    }
    if (this._aborted) return;
    this._finished = true;
    if (this.oncomplete) this.oncomplete({ target: this });
  }
}

class FakeIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._stores = new Map();
    this.objectStoreNames = {
      contains: (n) => this._stores.has(n),
    };
    this.onversionchange = null;
    this.onclose = null;
  }
  createObjectStore(name, options) {
    const opts = options || {};
    const raw = {
      keyPath: opts.keyPath !== undefined ? opts.keyPath : null,
      autoIncrement: !!opts.autoIncrement,
      autoIncCounter: 0,
      records: new Map(),
    };
    this._stores.set(name, raw);
    return new FakeIDBObjectStore(raw, { _enqueue: (op) => { const r = new FakeIDBRequest(); op(() => {}); return r; } });
  }
  transaction(storeNames, mode) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const n of names) {
      if (!this._stores.has(n)) throw new Error(`NotFoundError: no object store named "${n}"`);
    }
    return new FakeIDBTransaction(this, names, mode || 'readonly');
  }
  close() {
    // no-op utk test double ini (tidak ada koneksi lain yg perlu tahu)
  }
}

function createFakeIndexedDB() {
  const databases = new Map(); // name -> FakeIDBDatabase

  return {
    _databases: databases,
    open(name, version) {
      const req = new FakeIDBOpenDBRequest();
      microtask(() => {
        const existing = databases.get(name);
        const oldVersion = existing ? existing.version : 0;
        const newVersion = version || 1;
        let db = existing;
        if (!db) {
          db = new FakeIDBDatabase(name, newVersion);
          databases.set(name, db);
        }
        if (!existing || newVersion > oldVersion) {
          db.version = newVersion;
          if (req.onupgradeneeded) {
            req.onupgradeneeded({ target: { result: db }, oldVersion, newVersion });
          }
        }
        req._succeed(db);
      });
      return req;
    },
  };
}

module.exports = { createFakeIndexedDB, FakeIDBKeyRange };
