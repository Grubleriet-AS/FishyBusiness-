"""Put a boat script's anchors into its GLB in src/data without touching anything else (steg 125d, 15.11.2026). The anchors (where the
game sets the tub, the table, the gear and stands the crew) are data in the GLB's scene extras; a full export bakes the occlusion anew,
which is never the same twice (glbadd.py), so a change that only moves anchors would change the look of every part a little. This runs
the script's anchors() without Blender (bpy, bmesh and mathutils stubbed, as qa/stubcheck.py) and writes them into the GLB's JSON chunk;
the binary chunk is kept byte for byte.

    python3 tools/boats/glbanchors.py tools/boats/<script>.py src/data/boat-<script>.b64 [--check]

--check: only says whether the GLB's anchors are what the script gives (exit 1 if not). Keys that only the GLB has are kept."""
import os, sys, types, json, struct, base64, importlib.util


def load(script):
    for n in ('bpy', 'bmesh'): sys.modules[n] = types.ModuleType(n)
    m = types.ModuleType('mathutils'); m.Vector = lambda *v: v; m.Matrix = object; m.noise = None; sys.modules['mathutils'] = m
    here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here); sys.path.insert(0, os.path.dirname(os.path.abspath(script)))
    spec = importlib.util.spec_from_file_location('B', script); B = importlib.util.module_from_spec(spec); argv = sys.argv; sys.argv = [script]
    try: spec.loader.exec_module(B)
    finally: sys.argv = argv
    return B


def split(raw):
    if struct.unpack_from('<I', raw, 0)[0] != 0x46546C67: raise ValueError('not a GLB')
    jl = struct.unpack_from('<I', raw, 12)[0]; return json.loads(raw[20:20 + jl].decode()), raw[20 + jl:]


def join(J, rest):
    j = json.dumps(J, separators=(',', ':')).encode(); j += b' ' * ((4 - len(j) % 4) % 4)
    body = struct.pack('<II', len(j), 0x4E4F534A) + j + rest
    return struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body


def main():
    script, b64 = sys.argv[1], sys.argv[2]; B = load(script); new = json.loads(json.dumps(B.anchors()))
    raw = base64.b64decode(open(b64).read()); J, rest = split(raw); ex = J['scenes'][0].setdefault('extras', {}); old = ex.get('anchors', {})
    diff = sorted(k for k in set(old) | set(new) if old.get(k) != new.get(k) and k in new)
    print('%s: %d anchors differ: %s' % (os.path.basename(b64), len(diff), ', '.join(diff) or 'none'))
    if '--check' in sys.argv: sys.exit(1 if diff else 0)
    if not diff: return
    merged = dict(old); merged.update(new); ex['anchors'] = merged
    open(b64, 'w').write(base64.b64encode(join(J, rest)).decode())


if __name__ == '__main__': main()
