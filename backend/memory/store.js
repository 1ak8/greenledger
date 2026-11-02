/**
 * File-backed document store.
 *
 * Used only when a MongoDB server is unreachable. It mirrors the small slice of
 * the Mongoose API this project uses, so services and controllers run unchanged
 * and data survives a restart. Point MONGODB_URI at a real cluster to switch.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", ".data");

let counter = 0;
function newId() {
  counter += 1;
  const stamp = Date.now().toString(16);
  const seq = counter.toString(16).padStart(4, "0");
  return (stamp + seq).padEnd(24, "0").slice(0, 24);
}

function matches(row, query) {
  return Object.entries(query || {}).every(([key, expected]) => {
    const actual = row[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$in" in expected) {
        return expected.$in.some((v) => String(v) === String(actual));
      }
      if ("$ne" in expected) {
        return String(expected.$ne) !== String(actual);
      }
    }
    return String(actual) === String(expected);
  });
}

function sortRows(rows, spec) {
  if (!spec) return rows;
  const entries = Object.entries(spec);
  return [...rows].sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = a[key];
      const bv = b[key];
      if (av === bv) continue;
      return (av > bv ? 1 : -1) * dir;
    }
    return 0;
  });
}

class Collection {
  constructor(name) {
    this.name = name;
    this.file = path.join(DATA_DIR, `${name}.json`);
    this.rows = this.load();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      return [];
    }
  }

  persist() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.rows, null, 2));
  }

  wrap(row) {
    if (!row) return null;
    const self = this;
    const doc = { ...row };
    Object.defineProperty(doc, "save", {
      enumerable: false,
      value: async () => {
        const plain = { ...doc };
        delete plain.save;
        plain.updatedAt = new Date().toISOString();
        const idx = self.rows.findIndex((r) => r._id === doc._id);
        if (idx >= 0) self.rows[idx] = plain;
        else self.rows.push(plain);
        self.persist();
        Object.assign(doc, plain);
        return doc;
      },
    });
    return doc;
  }

  find(query = {}) {
    const self = this;
    let rows = this.rows.filter((r) => matches(r, query));
    const chain = {
      sort(spec) {
        rows = sortRows(rows, spec);
        return chain;
      },
      limit(n) {
        rows = rows.slice(0, n);
        return chain;
      },
      then(resolve, reject) {
        return Promise.resolve(rows.map((r) => self.wrap(r))).then(
          resolve,
          reject
        );
      },
    };
    return chain;
  }

  findOne(query = {}) {
    const self = this;
    let rows = this.rows.filter((r) => matches(r, query));
    const chain = {
      sort(spec) {
        rows = sortRows(rows, spec);
        return chain;
      },
      then(resolve, reject) {
        const first = rows[0] ? self.wrap(rows[0]) : null;
        return Promise.resolve(first).then(resolve, reject);
      },
    };
    return chain;
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    const now = new Date().toISOString();
    const row = {
      _id: newId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    this.persist();
    return this.wrap(row);
  }

  async findOneAndUpdate(query, update, options = {}) {
    const idx = this.rows.findIndex((r) => matches(r, query));
    if (idx === -1) {
      if (!options.upsert) return null;
      return this.create({ ...query, ...update });
    }
    const merged = {
      ...this.rows[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.rows[idx] = merged;
    this.persist();
    return this.wrap(merged);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  async deleteMany(query = {}) {
    this.rows = this.rows.filter((r) => !matches(r, query));
    this.persist();
  }
}

const collections = new Map();

function collection(name) {
  if (!collections.has(name)) collections.set(name, new Collection(name));
  return collections.get(name);
}

module.exports = { collection };
