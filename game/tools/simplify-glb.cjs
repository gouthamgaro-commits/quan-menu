// Simplify the skinned meshes of a GLB with meshoptimizer, keeping every vertex attribute (skin weights
// included) and dropping vertices no triangle uses any more.
// usage: node simplify-glb.cjs in.glb out.glb ratio [maxError]   (needs meshoptimizer: npm install meshoptimizer@0.21.0)
const fs = require('fs');
const { MeshoptSimplifier } = require('meshoptimizer');

const [, , src, dst, ratioS, errS] = process.argv;
const ratio = +ratioS || 0.35, maxErr = +errS || 0.02;

(async () => {
  await MeshoptSimplifier.ready;
  const buf = fs.readFileSync(src);
  const jl = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const bl = buf.readUInt32LE(20 + jl);
  const bin = buf.subarray(28 + jl, 28 + jl + bl);
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const CS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const elemBytes = (a) => NC[a.type] * CS[a.componentType];
  // raw bytes of accessor i, one element after another
  const raw = (i) => {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView], eb = elemBytes(a), st = bv.byteStride || eb;
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0), out = Buffer.alloc(a.count * eb);
    for (let k = 0; k < a.count; k++) bin.copy(out, k * eb, off + k * st, off + k * st + eb);
    return out;
  };
  const chunks = [];
  let size = 0;
  const views = [], accs = [];
  const put = (data, target) => {
    while (size % 4) { chunks.push(Buffer.alloc(1)); size++; }
    views.push({ buffer: 0, byteOffset: size, byteLength: data.length, ...(target ? { target } : {}) });
    chunks.push(data); size += data.length;
    return views.length - 1;
  };
  const addAcc = (a, data, target) => { accs.push({ ...a, bufferView: put(data, target), byteOffset: undefined }); return accs.length - 1; };

  // skins keep their matrices
  for (const sk of j.skins || []) if (sk.inverseBindMatrices != null) {
    const a = j.accessors[sk.inverseBindMatrices];
    sk.inverseBindMatrices = addAcc({ componentType: a.componentType, count: a.count, type: a.type }, raw(sk.inverseBindMatrices));
  }
  for (const me of j.meshes) for (const p of me.primitives) {
    const ia = j.accessors[p.indices], ib = raw(p.indices);
    const idx = ia.componentType === 5125 ? new Uint32Array(ib.buffer, ib.byteOffset, ia.count) : Uint32Array.from(new Uint16Array(ib.buffer, ib.byteOffset, ia.count));
    const pa = j.accessors[p.attributes.POSITION], pb = raw(p.attributes.POSITION);
    const pos = new Float32Array(pb.buffer.slice(pb.byteOffset, pb.byteOffset + pb.length));
    const target = Math.floor(idx.length * ratio / 3) * 3;
    const [simp, err] = MeshoptSimplifier.simplify(Uint32Array.from(idx), pos, 3, target, maxErr, []);
    // keep only the vertices still in use
    const remap = new Int32Array(pa.count).fill(-1), order = [];
    for (const v of simp) if (remap[v] < 0) { remap[v] = order.length; order.push(v); }
    const nidx = Uint32Array.from(simp, (v) => remap[v]);
    console.log(me.name || 'mesh', 'tris', idx.length / 3, '->', nidx.length / 3, 'verts', pa.count, '->', order.length, 'error', err.toFixed(4));
    const attrs = {};
    for (const [k, ai] of Object.entries(p.attributes)) {
      const a = j.accessors[ai], eb = elemBytes(a), data = raw(ai), out = Buffer.alloc(order.length * eb);
      order.forEach((v, n) => data.copy(out, n * eb, v * eb, v * eb + eb));
      const na = { componentType: a.componentType, count: order.length, type: a.type, ...(a.normalized ? { normalized: true } : {}) };
      if (k === 'POSITION') {
        const f = new Float32Array(out.buffer, out.byteOffset, order.length * 3), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        for (let n = 0; n < f.length; n++) { mn[n % 3] = Math.min(mn[n % 3], f[n]); mx[n % 3] = Math.max(mx[n % 3], f[n]); }
        na.min = mn; na.max = mx;
      }
      attrs[k] = addAcc(na, out, 34962);
    }
    p.attributes = attrs;
    const big = order.length > 65535;
    const ibuf = big ? Buffer.from(nidx.buffer) : Buffer.from(Uint16Array.from(nidx).buffer);
    p.indices = addAcc({ componentType: big ? 5125 : 5123, count: nidx.length, type: 'SCALAR' }, ibuf, 34963);
  }
  for (const im of j.images || []) if (im.bufferView != null) { const bv = j.bufferViews[im.bufferView]; im.bufferView = put(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)); }
  j.accessors = accs.map((a) => { const { byteOffset, ...r } = a; return r; });
  j.bufferViews = views;
  while (size % 4) { chunks.push(Buffer.alloc(1)); size++; }
  j.buffers = [{ byteLength: size }];
  let js = Buffer.from(JSON.stringify(j));
  if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - (js.length % 4), 0x20)]);
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + body.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(body.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(dst, Buffer.concat([head, jh, js, bh, body]));
  console.log('wrote', dst, fs.statSync(dst).size, 'bytes');
})();
