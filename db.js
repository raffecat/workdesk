// Database API for workdesk / aiden / anything.
// This is a nosql-ish API of collections and attributes.

var pg = require('pg').native;

var hasOwn = Object.prototype.hasOwnProperty;
var slice = Array.prototype.slice;

module.exports = createDatabase;

function AsyncCache(loader) {
    // an asynchronous cache for demand-loaded items.
    // TODO: does not expire cached items or bound cache size.
    var items = {}, loading = {};
    function getFromCache(key, callback) {
        if (hasOwn.call(items, key)) {
            // item is in the cache.
            return callback(null, items[key]);
        }
        if (hasOwn.call(loading, key)) {
            // already loading the item.
            loading[key].push(callback);
            return;
        }
        // begin loading the item.
        var queue = [callback];
        loading[key] = queue;
        loader(key, function (err, result) {
            if (err == null) {
                items[key] = result;
            }
            loading[key] = null;
            for (var i=0,n=queue.length;i<n;i++)
                queue[i](err, result);
        });
    }
    return getFromCache;
}

function createDatabase(conString) {
    var db = new pg.Client(conString);

    db.on('notice', function(msg) {
        console.log("notice:", msg);
    });

    db.connect(function (err) {
        if (err) {
            console.error("db.connect:", err);
            return;
        }

        var setup = [
            // attribute names        
            "CREATE TABLE names(name VARCHAR PRIMARY KEY, id BIGSERIAL NOT NULL)",
            "CREATE UNIQUE INDEX names_id_index ON names (id)",
            // object attributes
            "CREATE TABLE attrs(obj BIGINT NOT NULL, name BIGINT NOT NULL, val VARCHAR NOT NULL, PRIMARY KEY (obj,name))",
            // object ids
            "CREATE TABLE objs(parent BIGINT NOT NULL, key VARCHAR NOT NULL, id BIGSERIAL NOT NULL, PRIMARY KEY (parent,key))",
            "CREATE UNIQUE INDEX objs_id_index ON objs (id)",
            // set_field procedure
            "CREATE OR REPLACE FUNCTION set_field(id BIGINT, nid BIGINT, nval VARCHAR) RETURNS VOID AS $$ BEGIN "+
            "LOOP UPDATE attrs SET val=nval WHERE obj=id AND name=nid;" +
            "IF found THEN RETURN; END IF;" +
            "BEGIN INSERT INTO attrs (obj,name,val) VALUES (id,nid,val); RETURN;" +
            "EXCEPTION WHEN unique_violation THEN END;" +
            "END LOOP;" +
            "END; $$ LANGUAGE plpgsql",
            // set_fields procedure
            "CREATE OR REPLACE FUNCTION set_fields(rows attrs[]) RETURNS VOID AS $$ " +
            "DECLARE r attrs; BEGIN "+
            "FOREACH r IN ARRAY rows LOOP " +
            " LOOP UPDATE attrs SET val=r.val WHERE obj=r.obj AND name=r.name;" +
            " IF found THEN EXIT; END IF;" +
            " BEGIN INSERT INTO attrs (obj,name,val) VALUES (r.obj,r.name,r.val); EXIT;" +
            " EXCEPTION WHEN unique_violation THEN END;" +
            " END LOOP;" +
            "END LOOP; " +
            "END; $$ LANGUAGE plpgsql",
            // insert_names
            "CREATE OR REPLACE FUNCTION insert_names(VARCHAR[]) RETURNS BIGINT[] AS $$ " +
            "DECLARE nom VARCHAR; v BIGINT; arr BIGINT[]; i INTEGER := 1; BEGIN "+
            "FOREACH nom IN ARRAY $1 LOOP " +
            " BEGIN INSERT INTO names (name) VALUES (nom) RETURNING id INTO v;" +
            " EXCEPTION WHEN unique_violation THEN SELECT id FROM names WHERE name=nom INTO v; END; " +
            " arr[i] := v; i := i + 1; " +
            "END LOOP; " +
            "RETURN arr; " +
            "END; $$ LANGUAGE plpgsql"
        ];

        function execSetup(i) {
            if (!setup[i]) return;
            var q = db.query(setup[i], function (err, res) {
                // 42P07: relation already exists.
                if (err && err.code != '42P07') {
                    console.error("setup:", err);
                }
            });
            execSetup(i+1);
        }

        execSetup(0);
    });

    db.on('error', function (err) {
        console.error("db:", err);
    });

    // We need to cache objects by something known: the key path from the root,
    // so we can coalesce requests for objects before their parent oids are
    // resolved.
    var objCache = {};
    function getCachedObj(keyPath) {
        return objCache[keyPath] || (objCache[keyPath] = ObjModel(keyPath));
    }

    var oidCache = AsyncCache(asyncOidByPath);

    function asyncOidByPath(keyPath, callback) {
        // split the key path around the last slash.
        var lastSlash = keyPath.lastIndexOf('/');
        if (lastSlash < 0) {
            // the root of the keyspace has OID zero.
            return callback(null, 0);
        }
        var parentPath = keyPath.slice(0, lastSlash);
        var thisKey = keyPath.slice(lastSlash+1);
        // resolve the parent OID using this cache.
        oidCache(parentPath, function (err, parentOid) {
            if (err) return callback(err);
            // find this object key in the DB or create it now.
            if (parentOid == null) throw new Error("bad parentOid");
            findCreateOid(parentOid, thisKey, callback);
        });
    }

    function findCreateOid(parentOid, objKey, callback) {
        if (parentOid == null) throw new Error("bad parentOid");
        if (!objKey) throw new Error("bad objKey");
        db.query("SELECT id FROM objs WHERE parent = $1 AND key = $2", [parentOid, objKey], gotOid);
        function gotOid(err, result) {
            if (err) {
                console.log("findCreateOid:", err);
                return callback(err);
            }
            if (result.rows.length) {
                // found the OID for this parentOid and objKey pair.
                console.log("found OID for", objKey, result.rows[0].id);
                return callback(null, result.rows[0].id);
            }
            // generate a new OID for the parentOid and objKey pair.
            db.query("INSERT INTO objs (parent,key) VALUES ($1,$2) RETURNING id", [parentOid, objKey], insertedOid);
        }
        function insertedOid(err, result) {
            if (err) {
                console.log("insertedOid:", err);
                return callback(err);
            }
            if (result.rows.length) {
                // found the OID for this parentOid and objKey pair.
                var oid = result.rows[0].id;
                if (oid == null) throw new Error("bad insert OID");
                return callback(null, oid);
            }
            console.log("insertedOid: no rows returned from insert query", result);
            return callback(new Error("insertedOid: no rows returned from insert query"));
        }
    }

    function ObjModel(keyPath) {
        // be clear of purpose: is this meant to strong-ref its children (no),
        // use a cache (yes), does this coalesce requests for children (yes),
        // for attributes (yes), cluster leaf attributes (yes)
        var selfOid, changes, self = {queued: 0};
        function getOid(callback) {
            if (selfOid) return callback(null, selfOid);
            oidCache(keyPath, function (err, oid) {
                if (!err) selfOid = oid;
                callback(err, oid);
            });
        }
        function get(key) {
            // get a sub-collection from this collection.
            if (!key) throw new Error("db.get(key): key is required");
            return getCachedObj(keyPath+'/'+key);
        }
        function update(attrs) {
            // set attributes of this object.
            if (!changes) changes = {};
            for (var k in attrs) if (hasOwn.call(attrs,k)) changes[k] = attrs[k];
            getOid(function (err, oid) {
                if (err) {
                    console.log("update: getOid:", err);
                    return; // TODO: hmm reschedule here?
                }
                if (changes) {
                    var fields = changes;
                    changes = null;
                    // look up unique name IDs for attributes.
                    // must generate "$n" placeholders for the IN clause.
                    var names = [], holders = [], i = 1;
                    for (var k in fields) if (hasOwn.call(fields,k)) {
                        names.push(k);
                        holders.push('$'+(i++));
                    }
                    if (!holders.length)
                        return; // no fields to save.
                    db.query("SELECT name,id FROM names WHERE name IN ("+holders.join(',')+")", names, gotNames);
                    function gotNames(err, result) {
                        if (err) {
                            console.log("update: gotNames:", err);
                            return; // TODO: hmm reschedule here?
                        }
                        console.log("got names", result);
                        // build a map of field IDs from the result rows.
                        var nameIds = {}, rows = result.rows;
                        for (var i=0,n=rows.length; i<n; i++) {
                            var row = rows[i];
                            nameIds[row.name] = row.id;
                        }
                        // generate insert statements for new field names.
                        var inserts = [], insertNames = [];
                        for (var i=0,n=names.length; i<n; i++) {
                            var name = names[i];
                            if (!hasOwn.call(nameIds, name)) {
                                // use JSON to wrap it in "" and escape backslashes and quotes.
                                inserts.push(JSON.stringify(name));
                                insertNames.push(name);
                            }
                        }
                        if (inserts.length) {
                            db.query("SELECT insert_names($1) AS ids", ["{"+inserts.join(',')+"}"], didInsertNames);
                        } else {
                            commitFields();
                        }
                        function didInsertNames(err, result) {
                            if (err) {
                                console.log("update: didInsertNames:", err);
                                return; // TODO: hmm reschedule here?
                            }
                            // update the map of field IDs from the result rows.
                            console.log("did insert names", result);
                            var ids = result.rows[0].ids;
                            console.log("did insert names", ids);
                            for (var i=0,n=ids.length; i<n; i++) {
                                nameIds[insertNames[i]] = ids[i];
                            }
                            commitFields();
                        }
                        function commitFields() {
                            var rows = [];
                            for (var i=0,n=names.length; i<n; i++) {
                                var name = names[i];
                                // use JSON to wrap the value in "" and escape backslashes and quotes.
                                var val = JSON.stringify(fields[name]);
                                var row = ['(', oid, ',', nameIds[name], ',', val, ')'].join('');
                                // the entire row tuple must also be quoted in an array!
                                rows.push(JSON.stringify(row));
                            }
                            console.log("set_fields", '{'+rows.join(',')+'}');
                            db.query("SELECT set_fields($1)", ['{'+rows.join(',')+'}'], didSetFields);
                        }
                        function didSetFields(err) {
                            if (err) {
                                console.log("update: didSetFields:", err);
                            }
                        }
                    }
                }
            });
        }
        function attrs(callback) {
            // get a js object containing all attributes.
            getOid(function (err, oid) {
                if (err) return callback(err);
                db.query("SELECT n.name,a.val FROM attrs a LEFT JOIN names n ON n.id=a.name WHERE obj=$1", [oid], gotAttrs);
                function gotAttrs(err, result) {
                    if (err) {
                        console.log("queryAttrs:", err);
                        return callback(err);
                    }
                    // build a mapping of attributes from rows.
                    var map = {}, rows = result.rows;
                    for (var i=0,n=rows.length; i<n; i++) {
                        var row = rows[i];
                        map[row.name] = row.val;
                    }
                    return callback(null, map);
                }
            });
        }
        function find(terms, callback) {
            return {attrs: function(){} };
        }
        return {get:get, attrs:attrs, update:update, find:find};
    }

    return ObjModel("");
}
