// Self-check for the decoder's pure functions: `node decode/selfcheck.mjs`.
import assert from "node:assert/strict";
import { jsonParse, jsonFormat, jsonMinify, b64Encode, b64Decode, jwtDecode } from "./decode.js";

const code = (fn) => {
    try {
        fn();
    } catch (e) {
        return e;
    }
    assert.fail("expected an error");
};

// JSON: formatting keeps numbers and keys exactly, errors give line and column.
assert.equal(
    jsonFormat('{"a":[1,2,{}],"b":{"c":"x,y:{"}}'),
    '{\n  "a": [\n    1,\n    2,\n    {}\n  ],\n  "b": {\n    "c": "x,y:{"\n  }\n}',
);
assert.equal(
    jsonMinify('{ "n" : 12345678901234567890 , "s":"a \\" b", "e": [ ] }'),
    '{"n":12345678901234567890,"s":"a \\" b","e":[]}',
);
assert.equal(jsonMinify(' "\\\\" '), '"\\\\"');
assert.deepEqual(jsonParse("[1]"), [1]);
let e = code(() => jsonParse('{\n  "a": 1,\n}'));
assert.deepEqual([e.code, e.line, e.col, e.ch], ["json", 3, 1, "}"]);
e = code(() => jsonParse('{"a": 1'));
assert.deepEqual([e.line, e.col, e.ch], [1, 8, ""]);
e = code(() => jsonParse("{'a': 1}"));
assert.deepEqual([e.line, e.col, e.ch], [1, 2, "'"]);
e = code(() => jsonParse('["ž", tru]'));
assert.deepEqual([e.line, e.col, e.ch], [1, 10, "]"]);
e = code(() => jsonParse("[01]"));
assert.deepEqual([e.col, e.ch], [3, "1"]);
e = code(() => jsonParse("{} x"));
assert.deepEqual([e.col, e.ch], [4, "x"]);

// Base64: UTF-8 safe, both alphabets, padding optional.
assert.equal(
    b64Encode("Příliš žluťoučký kůň 🐎"),
    "UMWZw61sacWhIMW+bHXFpW91xI1rw70ga8WvxYgg8J+Qjg==",
);
assert.equal(
    b64Decode("UMWZw61sacWhIMW+bHXFpW91xI1rw70ga8WvxYgg8J+Qjg=="),
    "Příliš žluťoučký kůň 🐎",
);
assert.equal(b64Encode("??>", true), "Pz8-");
assert.equal(b64Encode("ÿ", true), "w78");
assert.equal(b64Decode("Pz8-"), "??>");
assert.equal(b64Decode("w78"), "ÿ");
assert.equal(b64Decode("aGVs\nbG8="), "hello");
assert.equal(code(() => b64Decode("ab$c")).code, "b64Invalid");
assert.equal(code(() => b64Decode("a")).code, "b64Invalid");
assert.equal(code(() => b64Decode("/w==")).code, "b64NotUtf8");

// JWT: header and payload decoded, times compared with now, signature never checked.
const part = (o) => b64Encode(JSON.stringify(o), true);
const tok = (p) => `${part({ alg: "HS256", typ: "JWT" })}.${part(p)}.c2ln`;
const now = 1_800_000_000_000;
let t = jwtDecode(tok({ sub: "1", iat: 1_700_000_000, exp: 1_700_003_600 }), now);
assert.equal(t.alg, "HS256");
assert.equal(t.status, "expired");
assert.equal(t.times.iat, 1_700_000_000);
assert.ok(t.payload.startsWith('{\n  "sub": "1"'));
assert.equal(jwtDecode(tok({ exp: 1_900_000_000 }), now).status, "valid");
assert.equal(jwtDecode(tok({ nbf: 1_900_000_000 }), now).status, "notYet");
assert.equal(jwtDecode("Bearer " + tok({ n: "č" }), now).status, "noExp");
assert.equal(code(() => jwtDecode("a.b")).code, "jwtParts");
assert.equal(code(() => jwtDecode("a.b.c.d.e")).code, "jwe");
e = code(() => jwtDecode(`${part({ alg: "none" })}.bm90IGpzb24.`));
assert.deepEqual([e.code, e.part], ["jwtPart", "payload"]);

console.log("decode self-check passed");
