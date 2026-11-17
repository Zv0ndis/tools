// Self-check for the subnet math: `node subnet/selfcheck.mjs`.
import assert from "node:assert/strict";
import * as s from "./subnet.js";

const info4 = (text) => {
    const p = s.parseV4(text);
    const i = s.v4info(p.addr, p.prefix);
    const ip = (n) => (n === null ? null : s.toV4(n));
    return [
        ip(i.network),
        ip(i.broadcast),
        ip(i.first),
        ip(i.last),
        i.hosts,
        ip(i.mask),
        ip(i.wildcard),
    ];
};
const throws = (fn, code) => assert.throws(fn, { message: code });

// IPv4 basics and every input form
assert.deepEqual(info4("192.168.1.10/24"), [
    "192.168.1.0",
    "192.168.1.255",
    "192.168.1.1",
    "192.168.1.254",
    254,
    "255.255.255.0",
    "0.0.0.255",
]);
assert.deepEqual(info4("192.168.1.10 255.255.255.0"), info4("192.168.1.10/24"));
assert.deepEqual(info4(" 192.168.1.10 / 255.255.255.0 "), info4("192.168.1.10/24"));
assert.deepEqual(info4("10.1.2.3/8"), [
    "10.0.0.0",
    "10.255.255.255",
    "10.0.0.1",
    "10.255.255.254",
    16777214,
    "255.0.0.0",
    "0.255.255.255",
]);
assert.deepEqual(info4("172.16.5.4/30"), [
    "172.16.5.4",
    "172.16.5.7",
    "172.16.5.5",
    "172.16.5.6",
    2,
    "255.255.255.252",
    "0.0.0.3",
]);
// /31: two hosts, no broadcast; /32: one host
assert.deepEqual(info4("10.0.0.7/31"), [
    "10.0.0.6",
    null,
    "10.0.0.6",
    "10.0.0.7",
    2,
    "255.255.255.254",
    "0.0.0.1",
]);
assert.deepEqual(info4("10.0.0.7/32"), [
    "10.0.0.7",
    null,
    "10.0.0.7",
    "10.0.0.7",
    1,
    "255.255.255.255",
    "0.0.0.0",
]);
assert.deepEqual(info4("10.0.0.7"), info4("10.0.0.7/32"));
// /0 and the top of the range stay unsigned
assert.deepEqual(info4("255.255.255.255/0"), [
    "0.0.0.0",
    "255.255.255.255",
    "0.0.0.1",
    "255.255.255.254",
    4294967294,
    "0.0.0.0",
    "255.255.255.255",
]);
assert.deepEqual(info4("255.255.255.255/24"), [
    "255.255.255.0",
    "255.255.255.255",
    "255.255.255.1",
    "255.255.255.254",
    254,
    "255.255.255.0",
    "0.0.0.255",
]);
assert.equal(s.toBin(s.v4("192.168.1.10")), "11000000.10101000.00000001.00001010");
assert.equal(s.maskToPrefix(0), 0);
assert.equal(s.maskToPrefix(0xffffffff), 32);
// Bad input
throws(() => s.parseV4("256.1.1.1/24"), "v4bad");
throws(() => s.parseV4("1.2.3/24"), "v4bad");
throws(() => s.parseV4("01.2.3.4"), "v4bad");
throws(() => s.parseV4("1.2.3.4/33"), "v4prefix");
throws(() => s.parseV4("1.2.3.4/255.0.255.0"), "v4mask");
throws(() => s.parseV4("1.2.3.4/"), "v4bad");
throws(() => s.parseV4("1.2.3.4 /24 x"), "v4bad");

// Splitting
const net = s.v4("192.168.1.0");
assert.equal(s.prefixForCount(24, 4), 26);
assert.equal(s.prefixForCount(24, 5), 27);
assert.equal(s.prefixForCount(24, 1), 24);
throws(() => s.prefixForCount(24, 0), "splitBad");
throws(() => s.prefixForCount(24, 512), "splitBig");
let sp = s.v4split(net, 24, 26);
assert.equal(sp.count, 4);
assert.deepEqual(
    sp.subnets.map((x) => [s.toV4(x.network), s.toV4(x.first), s.toV4(x.last)]),
    [
        ["192.168.1.0", "192.168.1.1", "192.168.1.62"],
        ["192.168.1.64", "192.168.1.65", "192.168.1.126"],
        ["192.168.1.128", "192.168.1.129", "192.168.1.190"],
        ["192.168.1.192", "192.168.1.193", "192.168.1.254"],
    ],
);
sp = s.v4split(0, 0, 32);
assert.equal(sp.count, 2 ** 32);
assert.equal(sp.subnets.length, 64);
sp = s.v4split(net, 24, 31);
assert.equal(sp.count, 128);
assert.deepEqual([sp.subnets[63].first, sp.subnets[63].last].map(s.toV4), [
    "192.168.1.126",
    "192.168.1.127",
]);
throws(() => s.v4split(net, 24, 24), "splitSmall");
throws(() => s.v4split(net, 24, 33), "v4prefix");

// IPv6
const v6 = (text) => {
    const p = s.parseV6(text);
    const i = s.v6info(p.addr, p.prefix);
    return [
        s.compress6(i.addr),
        s.expand6(i.addr),
        s.compress6(i.network),
        s.compress6(i.last),
        i.count,
    ];
};
assert.deepEqual(v6("2001:DB8::1/64"), [
    "2001:db8::1",
    "2001:0db8:0000:0000:0000:0000:0000:0001",
    "2001:db8::",
    "2001:db8::ffff:ffff:ffff:ffff",
    2n ** 64n,
]);
assert.deepEqual(v6("::"), ["::", "0000:0000:0000:0000:0000:0000:0000:0000", "::", "::", 1n]);
assert.deepEqual(v6("::/0").slice(2), [
    "::",
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    2n ** 128n,
]);
assert.equal(v6("::1")[0], "::1");
assert.equal(v6("1::")[0], "1::");
assert.equal(v6("::ffff:192.0.2.1")[0], "::ffff:c000:201");
// RFC 5952: one zero group is not shortened, the first longest run wins
assert.equal(v6("2001:db8:0:1:1:1:1:1")[0], "2001:db8:0:1:1:1:1:1");
assert.equal(v6("2001:0:0:1:0:0:0:1")[0], "2001:0:0:1::1");
assert.equal(v6("2001:db8:0:0:1:0:0:1")[0], "2001:db8::1:0:0:1");
assert.equal(v6("1:2:3:4:5:6:7::")[0], "1:2:3:4:5:6:7:0");
assert.equal(v6("2001:db8:abcd:12::/48")[2], "2001:db8:abcd::");
for (const bad of [
    "1::2::3",
    "12345::",
    ":1::",
    "1:2:3:4:5:6:7:8:9",
    "1:2:3:4:5:6:7",
    "fe80::1%eth0",
    "1.2.3.4",
    "g::1",
    "1:2:3:4:5:6:7:8::",
])
    throws(() => s.parseV6(bad), "v6bad");
throws(() => s.parseV6("::1/129"), "v6prefix");

console.log("subnet self-check passed");
