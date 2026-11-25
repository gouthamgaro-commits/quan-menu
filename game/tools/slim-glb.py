# Slim a Mixamo GLB for the game: make its T-pose clip the default pose, optionally turn it to face +z,
# drop all animations and unused UV sets, and pack the binary with only what is still referenced.
# usage: python3 slim-glb.py in.glb out.glb [--turn]
import json, struct, sys, math

src, dst = sys.argv[1], sys.argv[2]
turn = '--turn' in sys.argv
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + jl])
bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]
binb = b[28 + jl:28 + jl + bl]

def acc_floats(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return struct.unpack_from('<%df' % (a['count'] * n), binb, off), n

# 1. the T-pose becomes the rest pose
for an in j.get('animations', []):
    if 'tpose' not in an['name'].lower():
        continue
    for ch in an['channels']:
        s = an['samplers'][ch['sampler']]
        vals, n = acc_floats(s['output'])
        node = j['nodes'][ch['target']['node']]
        node.pop('matrix', None)
        node[ch['target']['path']] = list(vals[:n])
    print('rest pose from', an['name'])

# 2. face +z: turn the scene roots half a turn about y
def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [aw*bx + ax*bw + ay*bz - az*by, aw*by - ax*bz + ay*bw + az*bx, aw*bz + ax*by - ay*bx + az*bw, aw*bw - ax*bx - ay*by - az*bz]
if turn:
    for r in j['scenes'][j.get('scene', 0)]['nodes']:
        node = j['nodes'][r]
        node['rotation'] = qmul([0, 1, 0, 0], node.get('rotation', [0, 0, 0, 1]))
        t = node.get('translation')
        if t: node['translation'] = [-t[0], t[1], -t[2]]
    print('turned to face +z')

# 3. no animations, no UV sets that no texture reads
j.pop('animations', None)
used_tc = {0}
for m in j.get('materials', []):
    def walk(o):
        if isinstance(o, dict):
            if 'index' in o and 'texCoord' in o: used_tc.add(o['texCoord'])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(m)
for me in j['meshes']:
    for p in me['primitives']:
        for k in list(p['attributes']):
            if k.startswith('TEXCOORD_') and int(k.split('_')[1]) not in used_tc:
                del p['attributes'][k]

# 4. keep only referenced accessors and buffer views, and repack the binary
used_acc = []
def use_acc(i):
    if i not in used_acc: used_acc.append(i)
    return used_acc.index(i)
for me in j['meshes']:
    for p in me['primitives']:
        p['attributes'] = {k: use_acc(v) for k, v in p['attributes'].items()}
        if 'indices' in p: p['indices'] = use_acc(p['indices'])
        if 'targets' in p: p['targets'] = [{k: use_acc(v) for k, v in t.items()} for t in p['targets']]
for sk in j.get('skins', []):
    if 'inverseBindMatrices' in sk: sk['inverseBindMatrices'] = use_acc(sk['inverseBindMatrices'])
new_acc = [dict(j['accessors'][i]) for i in used_acc]
used_bv = []
def use_bv(i):
    if i not in used_bv: used_bv.append(i)
    return used_bv.index(i)
for a in new_acc:
    if 'bufferView' in a: a['bufferView'] = use_bv(a['bufferView'])
for im in j.get('images', []):
    if 'bufferView' in im: im['bufferView'] = use_bv(im['bufferView'])
out = bytearray()
new_bv = []
for i in used_bv:
    bv = dict(j['bufferViews'][i])
    data = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    while len(out) % 4: out.append(0)
    bv['byteOffset'] = len(out); bv['buffer'] = 0
    out += data
    new_bv.append(bv)
while len(out) % 4: out.append(0)
j['accessors'] = new_acc
j['bufferViews'] = new_bv
j['buffers'] = [{'byteLength': len(out)}]

js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(out)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
print(dst, len(b), '->', total, 'bytes')
