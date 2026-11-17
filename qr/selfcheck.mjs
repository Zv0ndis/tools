// Self-check for the QR encoder: `node qr/selfcheck.mjs`. Reference matrices come from libqrencode
// (`qrencode -8 -m 0 -t ASCII`) with the same mask forced.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { encode, reedSolomon, capacity, dataCodewords, toSvg, LEVELS } from "./encode.js";

const rows = (q) => q.modules.map((r) => r.map((c) => (c ? "#" : ".")).join(""));
const sha = (q) => createHash("sha256").update(rows(q).join("\n")).digest("hex");

// Reed-Solomon: the "HELLO WORLD" 1-M example from the standard's walkthrough.
assert.deepEqual(
    reedSolomon([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10),
    [196, 35, 39, 119, 235, 215, 231, 226, 93, 23],
);

// Data codewords per version and level (ISO/IEC 18004 table 7), versions 1-10 and 40.
const DATA = {
    1: [19, 16, 13, 9],
    2: [34, 28, 22, 16],
    3: [55, 44, 34, 26],
    4: [80, 64, 48, 36],
    5: [108, 86, 62, 46],
    6: [136, 108, 76, 60],
    7: [156, 124, 88, 66],
    8: [194, 154, 110, 86],
    9: [232, 182, 132, 100],
    10: [274, 216, 154, 122],
    40: [2956, 2334, 1666, 1276],
};
for (const [v, want] of Object.entries(DATA))
    assert.deepEqual(
        LEVELS.map((l) => dataCodewords(+v, l)),
        want,
        `data codewords v${v}`,
    );
assert.deepEqual(
    LEVELS.map((l) => capacity(40, l)),
    [2953, 2331, 1663, 1273],
);

// Known small matrices, in full.
assert.deepEqual(rows(encode("Hello", "L", { mask: 0 })), [
    "#######..#.##.#######",
    "#.....#..###..#.....#",
    "#.###.#.##.##.#.###.#",
    "#.###.#..#.#..#.###.#",
    "#.###.#...#.#.#.###.#",
    "#.....#.....#.#.....#",
    "#######.#.#.#.#######",
    "........##.##........",
    "###.########.##...#..",
    "###......##...#....##",
    "..#.#.##....#...#####",
    "#.####..#.#...#....#.",
    "####..#.###.#.#.#....",
    "........#..#.#.#..##.",
    "#######.##.#.###..###",
    "#.....#.######.##....",
    "#.###.#.#..#.###...##",
    "#.###.#..##...##..##.",
    "#.###.#.###.#...#.#.#",
    "#.....#.#.....#.#..#.",
    "#######.#...#.##...##",
]);
assert.deepEqual(rows(encode("https://zvondis.dev/", "M", { mask: 2 })), [
    "#######....##...#.#######",
    "#.....#...#...##..#.....#",
    "#.###.#.#...#.###.#.###.#",
    "#.###.#.#..#####..#.###.#",
    "#.###.#.#...#.#.#.#.###.#",
    "#.....#.####.###..#.....#",
    "#######.#.#.#.#.#.#######",
    "........###.#...#........",
    "#.#####...#.##....#####..",
    "####.#.###.###...#.#...#.",
    "#..#..####...######.##.##",
    ".##..#..#.....#.....#...#",
    "####.##..#.#...######.###",
    "##..##..###.##..#..#.#.#.",
    "#.....###....#####.###.##",
    "#..##..####.##.#.#.##...#",
    "#....##.#...#.#.#####.#..",
    "........##.....##...##...",
    "#######...###...#.#.#.###",
    "#.....#.#.##..#.#...##..#",
    "#.###.#.##.#...######.###",
    "#.###.#.#...####.##.#####",
    "#.###.#.###..##......##.#",
    "#.....#.....##.###.###..#",
    "#######.#.#.#.#....######",
]);

// Larger ones by hash: multi-block UTF-8 (v5), version info (v15), the largest symbol (v40).
assert.equal(
    sha(encode("Příliš žluťoučký kůň úpěl ďábelské ódy", "Q", { mask: 7 })),
    "cddcdea71507456feecd828c543e1ab68f6e77699b51a27f5fa932ad2e250d74",
);
assert.equal(
    sha(encode("x".repeat(200), "H", { mask: 0 })),
    "e159d3bafb872c2f20d3bec784c3f43e682d92803c7c90e0c1181356df585e01",
);
assert.equal(
    sha(encode("b".repeat(2331), "M", { mask: 2 })),
    "c6936d675303115a39ab3eedc9f7e501409a011c45cc2cc886b751dce5af6cc5",
);

// Decode the format bits back out of both copies for every level and an automatic mask.
const LEVEL_OF = { 1: "L", 0: "M", 3: "Q", 2: "H" };
for (const level of LEVELS)
    for (const text of ["", "a", "https://tools.zvondis.dev/qr/", "€".repeat(300)]) {
        const q = encode(text, level);
        const n = q.size;
        const m = q.modules;
        let a = 0;
        let b = 0;
        for (let i = 0; i < 15; i++) {
            const first = i < 6 ? m[i][8] : i < 8 ? m[i + 1][8] : i === 8 ? m[8][7] : m[8][14 - i];
            const second = i < 8 ? m[8][n - 1 - i] : m[n - 15 + i][8];
            a |= first << i;
            b |= second << i;
        }
        assert.equal(a, b, "both format copies agree");
        let rem = a ^ 0x5412;
        for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
        assert.equal(rem, 0, "format BCH checks out");
        const d = (a ^ 0x5412) >> 10;
        assert.equal(LEVEL_OF[d >> 3], level);
        assert.equal(d & 7, q.mask);
        assert.equal(m[n - 8][8], 1, "dark module");
        assert.equal(n, q.version * 4 + 17);
    }

assert.equal(encode("x".repeat(2953), "L").version, 40);
assert.throws(() => encode("x".repeat(2954), "L"), RangeError);
assert.throws(() => encode("x".repeat(1274), "H"), RangeError);
assert.match(toSvg(encode("a")), /^<svg [^>]*viewBox="0 0 29 29".*<\/svg>$/);

console.log("qr self-check passed");
