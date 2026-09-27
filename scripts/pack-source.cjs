/**
 * Packs the project source code into a downloadable .zip archive.
 *
 * Runs automatically before `next build` (see the `prebuild` npm script) so the
 * archive is always up to date in production, and can also be run on demand:
 *
 *   npm run pack
 *
 * Output: public/hutangku-source.zip
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "hutangku-source.zip");

const EXCLUDE_DIRS = new Set([".git", "node_modules", ".next", ".kilo", ".vscode", ".idea", "out", "build", "dist"]);
const EXCLUDE_FILES = new Set([".env", ".env.local", ".env.production", ".DS_Store", "hutangku-source.zip", "next-env.d.ts", "tsconfig.tsbuildinfo"]);

/* ---------- minimal ZIP writer (RFC 1950 + PKZIP appnote) ---------- */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosTime(d) {
  return ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
}

function dosDate(d) {
  return (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
}

/* ---------- collect files ---------- */

function collectFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      collectFiles(path.join(dir, entry.name), base, out);
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(entry.name)) continue;
      out.push(path.relative(base, path.join(dir, entry.name)));
    }
  }
  return out;
}

/* ---------- build archive ---------- */

function buildZip(relPaths) {
  const now = new Date();
  const time = dosTime(now);
  const date = dosDate(now);
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  let count = 0;

  for (const rel of relPaths) {
    const abs = path.join(ROOT, rel);
    const data = fs.readFileSync(abs);
    const nameBuf = Buffer.from(rel.replace(/\\/g, "/"), "utf8");
    const crc = crc32(data);
    const deflated = zlib.deflateRawSync(data);
    const method = deflated.length < data.length ? 8 : 0;
    const payload = method === 8 ? deflated : data;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local header signature
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 filename
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localChunks.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central header signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0x0800, 8); // flags: UTF-8 filename
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42); // relative offset of local header
    centralChunks.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
    count++;
  }

  const centralBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(count, 8);
  eocd.writeUInt16LE(count, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([Buffer.concat(localChunks), centralBuf, eocd]);
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const relPaths = collectFiles(ROOT).filter((p) => !p.startsWith("public" + path.sep) || !p.endsWith("hutangku-source.zip"));
  const archive = buildZip(relPaths);
  fs.writeFileSync(OUT_FILE, archive);

  const kb = (archive.length / 1024).toFixed(1);
  console.log(`\n📦 Source code packed: ${relPaths.length} files → public/hutangku-source.zip (${kb} KB)`);
}

main();
