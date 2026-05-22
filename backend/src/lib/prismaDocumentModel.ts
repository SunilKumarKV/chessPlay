// @ts-nocheck
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const store = new Map();
const modelRegistry = new Map();

const USER_REF_PATHS = new Set([
  "actor",
  "author",
  "blackPlayer",
  "createdBy",
  "friends",
  "friendRequests.from",
  "participants",
  "players.user",
  "referred",
  "reviewedBy",
  "referrer",
  "user",
  "whitePlayer",
  "winner",
]);

const HIDDEN_FIELDS = new Set([
  "__originalPassword",
  "emailVerificationTokenHash",
  "password",
  "passwordResetTokenHash",
  "refreshTokenHash",
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "__originalPassword") continue;
    if (typeof item === "function") continue;
    output[key] = clone(item);
  }
  return output;
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const time = Date.parse(value);
    if (Number.isFinite(time)) return time;
  }
  return value;
}

function getByPath(source, path) {
  return String(path).split(".").reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function setByPath(target, path, value) {
  const parts = String(path).split(".");
  let cursor = target;
  while (parts.length > 1) {
    const key = parts.shift();
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[0]] = value;
}

function unsetByPath(target, path) {
  const parts = String(path).split(".");
  let cursor = target;
  while (parts.length > 1) {
    cursor = cursor?.[parts.shift()];
    if (!cursor) return;
  }
  delete cursor[parts[0]];
}

function normalizeId(id) {
  return id == null ? null : String(id);
}

function compareValue(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof RegExp)) {
    let handledOperator = false;
    if ("$ne" in expected) {
      handledOperator = true;
      if (String(actual) === String(expected.$ne)) return false;
    }
    if ("$in" in expected) {
      handledOperator = true;
      if (!expected.$in.map(String).includes(String(actual))) return false;
    }
    if ("$nin" in expected) {
      handledOperator = true;
      if (expected.$nin.map(String).includes(String(actual))) return false;
    }
    if ("$exists" in expected) {
      handledOperator = true;
      if (Boolean(actual !== undefined && actual !== null) !== Boolean(expected.$exists)) return false;
    }
    if ("$gte" in expected) {
      handledOperator = true;
      if (!(comparable(actual) >= comparable(expected.$gte))) return false;
    }
    if ("$gt" in expected) {
      handledOperator = true;
      if (!(comparable(actual) > comparable(expected.$gt))) return false;
    }
    if ("$lte" in expected) {
      handledOperator = true;
      if (!(comparable(actual) <= comparable(expected.$lte))) return false;
    }
    if ("$lt" in expected) {
      handledOperator = true;
      if (!(comparable(actual) < comparable(expected.$lt))) return false;
    }
    if ("$all" in expected) {
      handledOperator = true;
      const values = Array.isArray(actual) ? actual.map(String) : [];
      return expected.$all.every((item) => values.includes(String(item)));
    }
    if ("$size" in expected) {
      handledOperator = true;
      return Array.isArray(actual) && actual.length === expected.$size;
    }
    if ("$regex" in expected) {
      handledOperator = true;
      const flags = expected.$options || "i";
      if (!new RegExp(expected.$regex, flags).test(String(actual || ""))) return false;
    }
    if (handledOperator) return true;
  }
  if (expected instanceof RegExp) return expected.test(String(actual || ""));
  if (Array.isArray(actual)) return actual.map(String).includes(String(expected));
  return String(actual ?? "") === String(expected ?? "");
}

function matchesFilter(doc, filter = {}) {
  return Object.entries(filter || {}).every(([key, expected]) => {
    if (key === "$or") return expected.some((item) => matchesFilter(doc, item));
    if (key === "$and") return expected.every((item) => matchesFilter(doc, item));
    if (key === "_id" || key === "id") return compareValue(doc._id || doc.id, expected);
    return compareValue(getByPath(doc, key), expected);
  });
}

function applyUpdate(doc, update = {}) {
  const next = { ...doc };
  const operatorKeys = Object.keys(update).filter((key) => key.startsWith("$"));
  if (!operatorKeys.length) {
    Object.assign(next, update);
    return next;
  }

  for (const [field, value] of Object.entries(update.$set || {})) setByPath(next, field, value);
  for (const field of Object.keys(update.$unset || {})) unsetByPath(next, field);
  for (const [field, value] of Object.entries(update.$inc || {})) setByPath(next, field, Number(getByPath(next, field) || 0) + Number(value));
  for (const [field, value] of Object.entries(update.$push || {})) {
    const current = getByPath(next, field);
    const additions = value && value.$each ? value.$each : [value];
    setByPath(next, field, [...(Array.isArray(current) ? current : []), ...additions]);
  }
  for (const [field, value] of Object.entries(update.$addToSet || {})) {
    const current = Array.isArray(getByPath(next, field)) ? getByPath(next, field) : [];
    const additions = value && value.$each ? value.$each : [value];
    for (const item of additions) {
      if (!current.map(String).includes(String(item))) current.push(item);
    }
    setByPath(next, field, current);
  }
  for (const [field, value] of Object.entries(update.$pull || {})) {
    const current = Array.isArray(getByPath(next, field)) ? getByPath(next, field) : [];
    setByPath(next, field, current.filter((item) => !compareValue(item, value)));
  }
  return next;
}

function createDataFromUpdate(filter = {}, update = {}) {
  const operatorKeys = Object.keys(update || {}).filter((key) => key.startsWith("$"));
  if (!operatorKeys.length) return { ...filter, ...update };
  return {
    ...filter,
    ...(update.$setOnInsert || {}),
    ...(update.$set || {}),
    ...Object.fromEntries(
      Object.entries(update.$inc || {}).map(([field, value]) => [field, Number(value || 0)]),
    ),
  };
}

function applyDefaults(collection, input = {}) {
  const base = { ...input };
  if (!base.createdAt) base.createdAt = nowIso();
  if (collection === "User") {
    base.rating ??= 1200;
    base.gamesPlayed ??= 0;
    base.gamesWon ??= 0;
    base.gamesLost ??= 0;
    base.gamesDrawn ??= 0;
    base.emailVerified ??= false;
    base.isAdmin ??= false;
    base.isBanned ??= false;
    base.plan ??= "free";
    base.planStatus ??= "active";
    base.isSupporter ??= false;
    base.isPremium ??= false;
    base.adsDisabled ??= false;
    base.coins ??= 0;
    base.analysisCredits ??= 10;
    base.puzzleRating ??= 1200;
    base.highestPuzzleRating ??= 1200;
    base.puzzlesSolved ??= 0;
    base.friends ??= [];
    base.friendRequests ??= [];
    base.badges ??= [];
    base.country ??= "US";
    base.bio ??= "";
  }
  if (collection === "Game") {
    base.moves ??= [];
    base.result ??= "ongoing";
    base.startTime ??= nowIso();
  }
  return base;
}

async function readCollection(collection) {
  if (!prisma) return Array.from(store.get(collection)?.values() || []).map(clone);
  const rows = await prisma.documentRecord.findMany({ where: { collection } });
  return rows.map((row) => ({ ...row.data, _id: row.id, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt }));
}

async function writeDocument(collection, doc) {
  const data = clone(doc);
  const id = normalizeId(data._id || data.id);
  delete data.id;
  delete data._id;
  data.updatedAt = nowIso();

  if (!prisma) {
    const collectionStore = store.get(collection) || new Map();
    const nextId = id || `${collection.toLowerCase()}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    collectionStore.set(nextId, { ...data, _id: nextId, id: nextId });
    store.set(collection, collectionStore);
    return { ...collectionStore.get(nextId) };
  }

  const row = id
    ? await prisma.documentRecord.upsert({
        where: { id },
        create: { id, collection, data },
        update: { data },
      })
    : await prisma.documentRecord.create({ data: { collection, data } });
  return { ...row.data, _id: row.id, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function applySelect(doc, fields) {
  if (!fields || !doc) return doc;
  const tokens = String(fields).split(/\s+/).filter(Boolean);
  const includes = tokens.filter((field) => !field.startsWith("-") && !field.startsWith("+"));
  const excludes = tokens.filter((field) => field.startsWith("-")).map((field) => field.slice(1));
  const explicitHiddenIncludes = new Set(tokens.filter((field) => field.startsWith("+")).map((field) => field.slice(1)));
  if (includes.length) {
    const selected = { _id: doc._id, id: doc.id };
    for (const field of includes) selected[field] = getByPath(doc, field);
    for (const field of explicitHiddenIncludes) selected[field] = getByPath(doc, field);
    return selected;
  }
  const next = { ...doc };
  for (const field of excludes) unsetByPath(next, field);
  for (const field of HIDDEN_FIELDS) {
    if (!explicitHiddenIncludes.has(field)) unsetByPath(next, field);
  }
  return next;
}

function sanitizeForJson(doc) {
  const data = clone(doc);
  for (const field of HIDDEN_FIELDS) unsetByPath(data, field);
  return data;
}

class Query {
  constructor(model, mode, filter = {}, update = null) {
    this.model = model;
    this.mode = mode;
    this.filter = filter || {};
    this.update = update;
    this.options = {};
  }
  select(fields) { this.options.select = fields; return this; }
  sort(sortSpec) { this.options.sort = sortSpec; return this; }
  limit(value) { this.options.limit = Number(value); return this; }
  skip(value) { this.options.skip = Number(value); return this; }
  populate(path, select) {
    if (!this.options.populate) this.options.populate = [];
    if (typeof path === "string") {
      this.options.populate.push({ path, select });
    } else if (path && typeof path === "object") {
      this.options.populate.push(path);
    }
    return this;
  }
  lean() { this.options.lean = true; return this; }
  exec() { return this.then((value) => value); }
  catch(onRejected) { return this.then(undefined, onRejected); }
  async then(onFulfilled, onRejected) {
    try {
      const result = await this.model._execute(this);
      return onFulfilled ? onFulfilled(result) : result;
    } catch (error) {
      if (onRejected) return onRejected(error);
      throw error;
    }
  }
}

function hydrate(Model, doc) {
  if (!doc) return null;
  return doc instanceof Model ? doc : new Model(doc);
}

function normalizeSelect(select) {
  if (!select) return null;
  if (typeof select === "string") return select;
  if (Array.isArray(select)) return select.join(" ");
  if (typeof select === "object") {
    return Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([field]) => field)
      .join(" ");
  }
  return null;
}

function refCollectionForPath(path) {
  return USER_REF_PATHS.has(path) ? "User" : null;
}

async function readDocById(collection, id) {
  if (!id) return null;
  const docs = await readCollection(collection);
  return docs.find((doc) => String(doc._id || doc.id) === String(id)) || null;
}

async function populateValue(value, collection, select) {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => populateValue(item, collection, select)));
  }
  if (typeof value === "object") return value;

  const doc = await readDocById(collection, value);
  return applySelect(doc, normalizeSelect(select));
}

async function populatePath(doc, populateOption) {
  if (!doc) return doc;
  const path = populateOption.path;
  const collection = refCollectionForPath(path);
  if (!collection) return doc;

  const parts = String(path).split(".");
  const next = clone(doc);

  async function populateAt(target, index) {
    if (target == null) return;
    const key = parts[index];
    if (index === parts.length - 1) {
      if (Array.isArray(target)) {
        await Promise.all(target.map((item) => populateAt(item, index)));
        return;
      }
      target[key] = await populateValue(target[key], collection, populateOption.select);
      return;
    }

    const child = target[key];
    if (Array.isArray(child)) {
      await Promise.all(child.map((item) => populateAt(item, index + 1)));
    } else {
      await populateAt(child, index + 1);
    }
  }

  await populateAt(next, 0);
  return next;
}

async function applyPopulates(docs, populateOptions = []) {
  if (!populateOptions.length) return docs;
  const isList = Array.isArray(docs);
  const list = isList ? docs : [docs];
  let populated = list;
  for (const option of populateOptions) {
    populated = await Promise.all(populated.map((doc) => populatePath(doc, option)));
  }
  return isList ? populated : populated[0];
}

function groupKeyFor(doc, expression) {
  if (expression == null) return null;
  if (typeof expression === "string" && expression.startsWith("$")) {
    return getByPath(doc, expression.slice(1));
  }
  return expression;
}

function accumulatorValue(doc, expression) {
  if (typeof expression === "number") return expression;
  if (typeof expression === "string" && expression.startsWith("$")) {
    return Number(getByPath(doc, expression.slice(1)) || 0);
  }
  return Number(expression || 0);
}

function applyGroup(docs, spec = {}) {
  const groups = new Map();
  const accumulators = Object.entries(spec).filter(([field]) => field !== "_id");

  for (const doc of docs) {
    const key = groupKeyFor(doc, spec._id);
    const mapKey = JSON.stringify(key);
    if (!groups.has(mapKey)) {
      groups.set(mapKey, { _id: key });
      for (const [field] of accumulators) groups.get(mapKey)[field] = 0;
    }

    const row = groups.get(mapKey);
    for (const [field, accumulator] of accumulators) {
      if (accumulator?.$sum !== undefined) {
        row[field] += accumulatorValue(doc, accumulator.$sum);
      }
    }
  }

  return Array.from(groups.values());
}

function createPrismaDocumentModel(collection) {
  class DocumentModel {
    constructor(input = {}) {
      Object.assign(this, applyDefaults(collection, input));
      this._id = normalizeId(this._id || this.id);
      this.id = this._id;
      this.__originalPassword = this.password;
    }

    async save() {
      if (collection === "User" && this.password && !String(this.password).startsWith("$2")) {
        this.password = await bcrypt.hash(this.password, 12);
      }
      const saved = await writeDocument(collection, applyDefaults(collection, this));
      Object.assign(this, saved);
      this.__originalPassword = this.password;
      return this;
    }

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password || "");
    }

    toObject() {
      return sanitizeForJson(this);
    }

    toJSON() {
      return sanitizeForJson(this);
    }
  }

  DocumentModel.collectionName = collection;
  modelRegistry.set(collection, DocumentModel);

  DocumentModel._execute = async (query) => {
    let docs = (await readCollection(collection)).filter((doc) => matchesFilter(doc, query.filter));
    if (query.options.sort) {
      const sortEntries = Object.entries(query.options.sort);
      docs.sort((a, b) => {
        for (const [field, direction] of sortEntries) {
          const av = getByPath(a, field);
          const bv = getByPath(b, field);
          if (av === bv) continue;
          return av > bv ? Number(direction) : -Number(direction);
        }
        return 0;
      });
    }
    if (query.options.skip) docs = docs.slice(query.options.skip);
    if (query.options.limit) docs = docs.slice(0, query.options.limit);
    docs = await applyPopulates(docs, query.options.populate);

    if (query.mode === "findOne") {
      const doc = docs[0] || null;
      return query.options.lean ? applySelect(doc, query.options.select) : hydrate(DocumentModel, applySelect(doc, query.options.select));
    }
    if (query.mode === "findById") {
      const doc = docs.find((item) => String(item._id) === String(query.filter._id)) || null;
      return query.options.lean ? applySelect(doc, query.options.select) : hydrate(DocumentModel, applySelect(doc, query.options.select));
    }
    if (query.mode === "findByIdAndUpdate" || query.mode === "findOneAndUpdate") {
      const doc = docs[0] || null;
      if (!doc && query.options.upsert) {
        const saved = await DocumentModel.create(createDataFromUpdate(query.filter, query.update));
        const populated = await applyPopulates(saved, query.options.populate);
        return hydrate(DocumentModel, applySelect(populated, query.options.select));
      }
      if (!doc) return null;
      const saved = await writeDocument(collection, applyUpdate(doc, query.update));
      const result = query.options.new ? saved : doc;
      const populated = await applyPopulates(result, query.options.populate);
      return query.options.lean ? applySelect(populated, query.options.select) : hydrate(DocumentModel, applySelect(populated, query.options.select));
    }
    return docs.map((doc) => (query.options.lean ? applySelect(doc, query.options.select) : hydrate(DocumentModel, applySelect(doc, query.options.select))));
  };

  DocumentModel.find = (filter = {}) => new Query(DocumentModel, "find", filter);
  DocumentModel.findOne = (filter = {}) => new Query(DocumentModel, "findOne", filter);
  DocumentModel.findById = (id) => new Query(DocumentModel, "findById", { _id: id });
  DocumentModel.create = async (input = {}) => {
    const doc = new DocumentModel(input);
    return doc.save();
  };
  DocumentModel.countDocuments = async (filter = {}) => (await readCollection(collection)).filter((doc) => matchesFilter(doc, filter)).length;
  DocumentModel.exists = async (filter = {}) => {
    const doc = (await readCollection(collection)).find((item) => matchesFilter(item, filter));
    return doc ? { _id: doc._id || doc.id } : null;
  };
  DocumentModel.findByIdAndUpdate = (id, update = {}, options = {}) => {
    const query = new Query(DocumentModel, "findByIdAndUpdate", { _id: id }, update);
    query.options = { ...query.options, ...options };
    return query;
  };
  DocumentModel.findOneAndUpdate = (filter = {}, update = {}, options = {}) => {
    const query = new Query(DocumentModel, "findOneAndUpdate", filter, update);
    query.options = { ...query.options, ...options };
    return query;
  };
  DocumentModel.updateOne = async (filter = {}, update = {}, options = {}) => {
    const existing = (await readCollection(collection)).find((doc) => matchesFilter(doc, filter));
    if (existing) {
      await writeDocument(collection, applyUpdate(existing, update));
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    }
    if (options.upsert) {
      await DocumentModel.create(createDataFromUpdate(filter, update));
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  };
  DocumentModel.findByIdAndDelete = async (id) => {
    if (!prisma) {
      store.get(collection)?.delete(String(id));
      return null;
    }
    return prisma.documentRecord.delete({ where: { id: String(id) } }).catch(() => null);
  };
  DocumentModel.deleteMany = async (filter = {}) => {
    const docs = (await readCollection(collection)).filter((doc) => matchesFilter(doc, filter));
    if (prisma) {
      await prisma.documentRecord.deleteMany({ where: { id: { in: docs.map((doc) => doc._id) } } });
    } else {
      for (const doc of docs) store.get(collection)?.delete(doc._id);
    }
    return { deletedCount: docs.length };
  };
  DocumentModel.updateMany = async (filter = {}, update = {}) => {
    const docs = (await readCollection(collection)).filter((doc) => matchesFilter(doc, filter));
    for (const doc of docs) {
      await writeDocument(collection, applyUpdate(doc, update));
    }
    return { matchedCount: docs.length, modifiedCount: docs.length };
  };
  DocumentModel.bulkWrite = async (operations = []) => {
    let upsertedCount = 0;
    let modifiedCount = 0;
    for (const operation of operations) {
      if (!operation.updateOne) continue;
      const { filter = {}, update = {}, upsert = false } = operation.updateOne;
      const existing = (await readCollection(collection)).find((doc) => matchesFilter(doc, filter));
    if (existing) {
      await writeDocument(collection, applyUpdate(existing, update));
      modifiedCount += 1;
    } else if (upsert) {
        await DocumentModel.create(createDataFromUpdate(filter, update));
        upsertedCount += 1;
      }
    }
    return { upsertedCount, modifiedCount };
  };
  DocumentModel.aggregate = async (pipeline = []) => {
    let docs = await readCollection(collection);
    for (const stage of pipeline) {
      if (stage.$match) docs = docs.filter((doc) => matchesFilter(doc, stage.$match));
      if (stage.$sample) docs = docs.sort(() => Math.random() - 0.5).slice(0, stage.$sample.size || 1);
      if (stage.$group) docs = applyGroup(docs, stage.$group);
      if (stage.$sort) {
        const entries = Object.entries(stage.$sort);
        docs.sort((a, b) => entries.reduce((result, [field, direction]) => result || (getByPath(a, field) > getByPath(b, field) ? Number(direction) : -Number(direction)), 0));
      }
      if (stage.$limit) docs = docs.slice(0, stage.$limit);
    }
    return docs;
  };

  return DocumentModel;
}

function isValidId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

export { createPrismaDocumentModel, isValidId };
