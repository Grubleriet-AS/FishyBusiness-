#!/usr/bin/env python3
"""The regression in parts (tools/regresjon/RUTINE.md, 09.11.2026). `run.py full` runs every test in one command, and the tool that
runs it stops a command after two hours: on 09.11.2026 both the full run and the follow-up stopped there, and about 50 of the 58 3D
tests never ran. This prints the parts, one command line each, so each part is its own background command under the limit:

    python3 tools/regresjon/deler.py lite      the unit tests and the tests that do not look at 3D (LITE), in two halves
    python3 tools/regresjon/deler.py 3d        the 3D tests (D3), eight to a line
    python3 tools/regresjon/deler.py solo      the tests that measure time, alone, one to a line
    python3 tools/regresjon/deler.py alle      all three, in that order
    python3 tools/regresjon/deler.py --json natt|uke|prove [--lite N]
                                               the parts as GitHub Actions' matrix (.github/workflows/regresjon.yml, live-drift fase 5):
                                               natt the tests without 3D (and the unit tests), uke all of it, prove two light tests (a PR
                                               that changes the workflow); --lite N splits the tests without 3D in N parts (GitHub's
                                               machines run each part side by side)

Each line is the arguments to `python3 tests/run.py smoke`. Nothing is left out: the union of the lines is D3 + LITE + SOLO, as
`run.py full` runs them.
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import run as R   # tests/run.py: D3, LITE, SOLO (its main() runs only as a script)


def parts(kind, nlite=2):
    solo = list(dict.fromkeys(R.SOLO))
    lite = [n for n in dict.fromkeys(R.LITE) if n not in solo]
    d3 = [n for n in dict.fromkeys(R.D3) if n not in solo and n not in lite]
    if kind == 'lite':
        h = (len(lite) + nlite - 1) // nlite   # two halves by default: on 09.11.2026 all of LITE took most of the two hours
        out = [lite[i:i + h] for i in range(0, len(lite), h)]
        out[0] = ['unit'] + out[0]
        return out
    if kind == '3d':
        return [d3[i:i + 8] for i in range(0, len(d3), 8)]
    if kind == 'solo':
        return [[n] for n in solo]
    if kind == 'alle':
        return parts('lite', nlite) + parts('3d') + parts('solo')
    sys.exit(__doc__)


def matrix(modus, nlite):
    """[{navn, tester}] for GitHub Actions: natt the tests without 3D, uke all, prove two light tests."""
    if modus == 'prove': ps = [('prove-1', ['unit', 'boottest', 'errtest'])]
    else:
        ps = [('lite-%d' % (i + 1), p) for i, p in enumerate(parts('lite', nlite))]
        if modus == 'uke':
            ps += [('3d-%d' % (i + 1), p) for i, p in enumerate(parts('3d'))]
            ps.append(('solo', [n for p in parts('solo') for n in p]))   # (one machine for the timed ones, one after the other: alone)
    return [{'navn': n, 'tester': ' '.join(p)} for n, p in ps]


if __name__ == '__main__':
    a = sys.argv[1:]
    nlite = int(a[a.index('--lite') + 1]) if '--lite' in a else 2
    if '--json' in a:
        import json
        print(json.dumps(matrix(next((x for x in a if x in ('natt', 'uke', 'prove')), 'natt'), nlite)))
    else:
        for p in parts(a[0] if a and not a[0].startswith('--') else 'alle', nlite):
            print(' '.join(p))
