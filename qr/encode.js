// QR code encoder (ISO/IEC 18004): byte mode, versions 1 to 40, levels L/M/Q/H, Reed-Solomon,
// all eight masks scored by the standard penalty rules. No DOM, so node can import it too.

export const LEVELS = ["L", "M", "Q", "H"];
const FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

// Per level, indexed by version (0 unused): ECC codewords in each block, and number of blocks.
const ECC_PER_BLOCK = {
    L: [
        0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28,
        30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    M: [
        0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28,
        28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    ],
    Q: [
        0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30,
        30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    H: [
        0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24,
        30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
};
const BLOCKS = {
    L: [
        0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13,
        14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
    ],
    M: [
        0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
        25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
    ],
    Q: [
        0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29,
        34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
    ],
    H: [
        0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35,
        37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
    ],
};

// Modules left for data and ECC once the function patterns are drawn.
function rawModules(v) {
    let n = (16 * v + 128) * v + 64;
    if (v >= 2) {
        const a = Math.floor(v / 7) + 2;
        n -= (25 * a - 10) * a - 55;
        if (v >= 7) n -= 36;
    }
    return n;
}

export function dataCodewords(v, level) {
    return (rawModules(v) >> 3) - ECC_PER_BLOCK[level][v] * BLOCKS[level][v];
}

// Longest byte-mode payload, in bytes, that fits version v.
export function capacity(v, level) {
    return Math.floor((dataCodewords(v, level) * 8 - 4 - (v < 10 ? 8 : 16)) / 8);
}

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++, x = x & 0x80 ? (x << 1) ^ 0x11d : x << 1) {
    EXP[i] = EXP[i + 255] = x;
    LOG[x] = i;
}
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

// Reed-Solomon ECC codewords for data: the remainder of data(x) * x^n divided by the generator.
export function reedSolomon(data, n) {
    let gen = [1];
    for (let i = 0; i < n; i++) {
        const next = new Array(gen.length + 1).fill(0);
        gen.forEach((c, j) => {
            next[j] ^= c;
            next[j + 1] ^= mul(c, EXP[i]);
        });
        gen = next;
    }
    const rem = new Array(n).fill(0);
    for (const b of data) {
        const f = b ^ rem.shift();
        rem.push(0);
        for (let j = 0; j < n; j++) rem[j] ^= mul(gen[j + 1], f);
    }
    return rem;
}

// BCH codes for the 15 format bits and the 18 version bits.
export function formatBits(level, mask) {
    const d = (FORMAT_BITS[level] << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >> 9) * 0x537);
    return ((d << 10) | r) ^ 0x5412;
}

function versionBits(v) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >> 11) * 0x1f25);
    return (v << 12) | r;
}

function alignmentPositions(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2;
    const step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
    const out = [6];
    for (let p = v * 4 + 10; out.length < n; p -= step) out.splice(1, 0, p);
    return out;
}

const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function codewords(bytes, v, level) {
    const capacityBits = dataCodewords(v, level) * 8;
    const bits = [];
    const put = (value, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    put(0b0100, 4);
    put(bytes.length, v < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    put(0, Math.min(4, capacityBits - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) put(pad, 8);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

    // Split into blocks (the last ones one codeword longer), add ECC to each, then interleave.
    const blocks = BLOCKS[level][v];
    const ecLen = ECC_PER_BLOCK[level][v];
    const total = rawModules(v) >> 3;
    const shortBlocks = blocks - (total % blocks);
    const shortLen = Math.floor(total / blocks) - ecLen;
    const dataBlocks = [];
    const eccBlocks = [];
    for (let i = 0, k = 0; i < blocks; i++) {
        const len = shortLen + (i < shortBlocks ? 0 : 1);
        const block = data.slice(k, k + len);
        k += len;
        dataBlocks.push(block);
        eccBlocks.push(reedSolomon(block, ecLen));
    }
    const out = [];
    for (let i = 0; i <= shortLen; i++)
        for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ecLen; i++) for (const b of eccBlocks) out.push(b[i]);
    return out;
}

function penalty(m) {
    const n = m.length;
    let score = 0;
    let dark = 0;
    const line = (get) => {
        for (let i = 0; i < n; i++) {
            let run = 1;
            for (let j = 1; j <= n; j++) {
                if (j < n && get(i, j) === get(i, j - 1)) run++;
                else {
                    if (run >= 5) score += run - 2;
                    run = 1;
                }
            }
            // Finder-like 1:1:3:1:1 with four light modules on one side; outside the symbol counts as light.
            const at = (j) => (j < 0 || j >= n ? 0 : get(i, j));
            for (let j = -4; j < n; j++) {
                const core =
                    at(j) &&
                    !at(j + 1) &&
                    at(j + 2) &&
                    at(j + 3) &&
                    at(j + 4) &&
                    !at(j + 5) &&
                    at(j + 6);
                if (!core) continue;
                if (!at(j - 1) && !at(j - 2) && !at(j - 3) && !at(j - 4)) score += 40;
                if (!at(j + 7) && !at(j + 8) && !at(j + 9) && !at(j + 10)) score += 40;
            }
        }
    };
    line((y, x) => m[y][x]);
    line((x, y) => m[y][x]);
    for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
            dark += m[y][x];
            if (x < n - 1 && y < n - 1) {
                const c = m[y][x];
                if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
            }
        }
    return score + Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
}

// text: string. Returns { version, level, mask, size, modules } with modules[y][x] 1 = dark.
// Throws RangeError when the text is too long for version 40 at this level.
// opts.mask forces one mask (0-7) instead of picking the lowest penalty; tests use it.
export function encode(text, level = "M", opts = {}) {
    if (!LEVELS.includes(level)) throw new RangeError("bad level");
    const bytes = new TextEncoder().encode(text);
    let v = 1;
    while (v <= 40 && capacity(v, level) < bytes.length) v++;
    if (v > 40) throw new RangeError("too long");

    const size = v * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(0));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => {
        m[y][x] = dark ? 1 : 0;
        fixed[y][x] = true;
    };

    for (let i = 0; i < size; i++) {
        set(6, i, i % 2 === 0);
        set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [
        [3, 3],
        [size - 4, 3],
        [3, size - 4],
    ])
        for (let dy = -4; dy <= 4; dy++)
            for (let dx = -4; dx <= 4; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                const d = Math.max(Math.abs(dx), Math.abs(dy));
                if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
            }
    const align = alignmentPositions(v);
    const last = align.length - 1;
    align.forEach((ay, i) =>
        align.forEach((ax, j) => {
            if ((i === 0 && (j === 0 || j === last)) || (i === last && j === 0)) return; // finder corners
            for (let dy = -2; dy <= 2; dy++)
                for (let dx = -2; dx <= 2; dx++)
                    set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }),
    );

    // Format bit i goes to both cells in formatCells[i]; reserve them now, fill them per mask.
    const formatCells = [];
    for (let i = 0; i < 15; i++) {
        const first = i < 6 ? [8, i] : i < 8 ? [8, i + 1] : i === 8 ? [7, 8] : [14 - i, 8];
        const second = i < 8 ? [size - 1 - i, 8] : [8, size - 15 + i];
        formatCells.push([first, second]);
        set(...first, 0);
        set(...second, 0);
    }
    set(8, size - 8, 1); // the dark module
    if (v >= 7) {
        const b = versionBits(v);
        for (let i = 0; i < 18; i++) {
            const a = size - 11 + (i % 3);
            const c = Math.floor(i / 3);
            set(a, c, (b >> i) & 1);
            set(c, a, (b >> i) & 1);
        }
    }

    // Data in two-module columns, zigzagging up and down from the bottom right, skipping column 6.
    const data = codewords(bytes, v, level);
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        const up = ((right + 1) & 2) === 0;
        for (let k = 0; k < size; k++) {
            const y = up ? size - 1 - k : k;
            for (const x of [right, right - 1]) {
                if (fixed[y][x]) continue;
                if (i < data.length * 8) m[y][x] = (data[i >> 3] >> (7 - (i & 7))) & 1;
                i++;
            }
        }
    }

    const applied = (mask) => {
        const out = m.map((row, y) =>
            row.map((c, x) => (!fixed[y][x] && MASKS[mask](x, y) ? c ^ 1 : c)),
        );
        const f = formatBits(level, mask);
        formatCells.forEach((cells, j) => {
            for (const [x, y] of cells) out[y][x] = (f >> j) & 1;
        });
        return out;
    };

    let best = null;
    for (let mask = 0; mask < 8; mask++) {
        if (opts.mask !== undefined && mask !== opts.mask) continue;
        const modules = applied(mask);
        const score = penalty(modules);
        if (!best || score < best.score) best = { mask, score, modules };
    }
    return { version: v, level, mask: best.mask, size, modules: best.modules };
}

// SVG markup with a quiet zone of `border` modules; one path keeps it small.
export function toSvg({ size, modules }, border = 4) {
    const dim = size + border * 2;
    let d = "";
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
            if (modules[y][x]) d += `M${x + border} ${y + border}h1v1h-1z`;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
        `<rect width="${dim}" height="${dim}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`
    );
}
