#!/usr/bin/env python3
"""The static check of a migration (live-drift fase 3, 18.11.2026).

Jonas 18.11.2026: «Gjør databasemigreringer bakoverkompatible («expand-and-contract», aldri destruktiv SQL som DROP eller TRUNCATE i
auto-spor) slik at påloggede PWA-brukere aldri mister fremdrift under oppdatering. La CI/staging kjøre trygge migreringer automatisk,
mens produksjon kun oppdateres i selve slippet.»

Each file in supabase/migrations/ gets one answer:

- ok (0): only expansion (a new table, a new column that may be null or has a default, a function created or replaced with the same
  arguments, an index, a grant), and safe to run twice (`if not exists`, `or replace`, a drop that the same file creates again). Such
  a file may run by itself: on the test project when it reaches the working branch (.github/workflows/migreringer.yml), and in
  production from the gate's server in the release (tools/server/gate/migrer.py).
- jonas (3): it changes data (`update`, `delete` outside a function), drops a function with arguments the file does not create again
  (a signature the released game may still call: make `save_put5` beside `save_put4` instead), makes a column `not null`, drops with
  `cascade`, or makes a type. Jonas runs it, or says it may go.
- stopp (1): destructive (`truncate`, `drop table`, `drop schema`, `drop column`, a rename, a changed column type), or not safe to run
  twice (`create table` without `if not exists`, and the like). A destructive file with the line `-- kontrakt: <why>` (the contract
  step of expand-and-contract, only in a session with Jonas) is `jonas` instead.

The SQL is split into statements outside quotes, comments and dollar-quoted bodies, so what a function does inside its body is not
read as a statement of the migration.

    python3 tools/ci/migsjekk.py FILE...                    the answer for each file and the worst as the exit code
    python3 tools/ci/migsjekk.py --base REF [--head REF]    the files added or changed in supabase/migrations/ since REF
    python3 tools/ci/migsjekk.py --json ...                 the same as JSON on the last line
    python3 tools/ci/migsjekk.py --selftest                 the checks of this file
"""
import argparse, json, os, re, subprocess, sys

OK, JONAS, STOPP = 'ok', 'jonas', 'stopp'
CODE = {OK: 0, JONAS: 3, STOPP: 1}
RANK = {OK: 0, JONAS: 1, STOPP: 2}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def statements(sql):
    """The statements of a SQL text, lower case and on one line, with quotes, comments and $-bodies blanked out."""
    out, cur, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith('--', i):
            j = sql.find('\n', i); i = n if j < 0 else j; continue
        if sql.startswith('/*', i):
            j = sql.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and j + 1 < n and sql[j + 1] == "'": j += 2; continue
                if sql[j] == "'": break
                j += 1
            cur.append("''"); i = j + 1; continue
        if c == '$':
            m = re.match(r'\$([A-Za-z_][A-Za-z_0-9]*)?\$', sql[i:])
            if m:
                tag = m.group(0); j = sql.find(tag, i + len(tag))
                cur.append(' $body$ '); i = n if j < 0 else j + len(tag); continue
        if c == ';':
            s = ' '.join(''.join(cur).split()).lower()
            if s: out.append(s)
            cur = []; i += 1; continue
        cur.append(c); i += 1
    s = ' '.join(''.join(cur).split()).lower()
    if s: out.append(s)
    return out


NAME = r'([a-z_][a-z0-9_."]*)'
ARGS = r'\(([^)]*)\)'


def _norm_args(a):
    return ','.join(x.strip() for x in re.sub(r'\b(in|default\s+[^,]+)\b', '', a).split(',') if x.strip())


def check_text(sql, name='?'):
    """{'svar': ok|jonas|stopp, 'funn': [(svar, why, statement)]} for one migration's text."""
    sts = statements(sql)
    contract = bool(re.search(r'^\s*--\s*kontrakt:', sql, re.I | re.M))
    created = {'function': set(), 'policy': set(), 'trigger': set(), 'view': set(), 'index': set(), 'constraint': set()}
    fn_sigs = set()
    for s in sts:
        m = re.match(r'create (or replace )?function ' + NAME + r'\s*' + ARGS, s)
        if m:
            fn = m.group(2).split('.')[-1].strip('"'); created['function'].add(fn); fn_sigs.add((fn, _norm_args(m.group(3))))
        for kind in ('policy', 'trigger', 'view', 'index'):
            m = re.match(r'create (or replace )?(unique )?(materialized )?' + kind + r' (if not exists )?' + NAME, s)
            if m: created[kind].add(m.group(5).split('.')[-1].strip('"'))
        for m in re.finditer(r'add constraint ' + NAME, s): created['constraint'].add(m.group(1).strip('"'))
    found = []
    def f(answer, why, s):
        if answer == STOPP and contract and why.startswith('destruktiv'): answer, why = JONAS, why + ' (kontrakt)'
        found.append((answer, why, s[:160]))
    for s in sts:
        # (live-drift fase 3, Jonas 18.11.2026: the runner wraps each migration in a transaction, where these cannot run)
        if ' concurrently' in s and re.match(r'(create|drop|reindex)\b', s):
            f(JONAS, 'concurrently kan ikke kjøres i en transaksjon: bruk «create index if not exists» i det automatiske sporet', s); continue
        if s.startswith('vacuum'): f(JONAS, 'vacuum kan ikke kjøres i en transaksjon', s); continue
        if re.match(r'(begin|commit|set |select |grant |revoke |comment |notify |analyze|do \$body\$|insert )', s):
            if s.startswith('insert ') and ' on conflict ' not in s: f(JONAS, 'data: insert uten «on conflict» (legger til rader hver gang den kjøres)', s)
            continue
        if s.startswith('truncate'): f(STOPP, 'destruktiv: truncate', s); continue
        if re.match(r'drop (table|schema)', s): f(STOPP, 'destruktiv: ' + ' '.join(s.split()[:2]), s); continue
        if re.match(r'(update|delete) ', s): f(JONAS, 'data: %s utenfor en funksjon' % s.split()[0], s); continue
        if ' cascade' in s and s.startswith('drop '): f(JONAS, 'drop med cascade', s); continue
        if s.startswith('alter table'):
            if re.search(r'\bdrop column\b', s): f(STOPP, 'destruktiv: drop column', s); continue
            if re.search(r'\brename\b', s): f(STOPP, 'destruktiv: rename', s); continue
            if re.search(r'\balter column \S+ (set data )?type\b', s): f(STOPP, 'destruktiv: endret kolonnetype', s); continue
            if re.search(r'\bset not null\b', s): f(JONAS, 'kolonne gjort «not null» (gammel kode kan sende null)', s); continue
            for m in re.finditer(r'\badd column (if not exists )?(\S+)([^,]*)', s):
                if not m.group(1): f(STOPP, 'ikke idempotent: add column uten «if not exists»', s)
                elif re.search(r'\bnot null\b', m.group(3)) and not re.search(r'\bdefault\b', m.group(3)): f(JONAS, 'ny kolonne «not null» uten standardverdi', s)
            for m in re.finditer(r'\bdrop constraint (if exists )?' + NAME, s):
                if m.group(2).strip('"') not in created['constraint']: f(JONAS, 'drop constraint som fila ikke legger til igjen', s)
            if re.search(r'\badd constraint\b', s) and not re.search(r'\bdrop constraint if exists\b', s) and not any(
                    re.search(r'\bdrop constraint if exists ' + re.escape(c) + r'\b', x) for x in sts for c in created['constraint']):
                f(STOPP, 'ikke idempotent: add constraint uten «drop constraint if exists» først', s)
            continue
        m = re.match(r'drop function (if exists )?' + NAME + r'\s*(?:' + ARGS + ')?', s)
        if m:
            fn = m.group(2).split('.')[-1].strip('"'); args = _norm_args(m.group(3) or '')
            if (fn, args) not in fn_sigs: f(JONAS, 'drop function %s(%s) uten at fila lager den samme igjen (signaturen kan være i bruk)' % (fn, args), s)
            continue
        m = re.match(r'drop (policy|trigger|view|materialized view|index) (if exists )?' + NAME, s)
        if m:
            kind = 'view' if 'view' in m.group(1) else m.group(1)
            if m.group(3).split('.')[-1].strip('"') not in created[kind]: f(JONAS, 'drop %s som fila ikke lager igjen' % m.group(1), s)
            elif not m.group(2): f(STOPP, 'ikke idempotent: drop %s uten «if exists»' % m.group(1), s)
            continue
        if s.startswith('drop '): f(JONAS, 'drop: ' + ' '.join(s.split()[:3]), s); continue
        if re.match(r'create table (?!if not exists)', s): f(STOPP, 'ikke idempotent: create table uten «if not exists»', s); continue
        if re.match(r'create (unique )?index (?!if not exists)', s): f(STOPP, 'ikke idempotent: create index uten «if not exists»', s); continue
        if re.match(r'create function', s): f(STOPP, 'ikke idempotent: create function uten «or replace»', s); continue
        if re.match(r'create (materialized )?view', s): f(STOPP, 'ikke idempotent: create view uten «or replace»', s); continue
        if re.match(r'create (extension|schema|sequence) (?!if not exists)', s): f(STOPP, 'ikke idempotent: ' + ' '.join(s.split()[:2]) + ' uten «if not exists»', s); continue
        if re.match(r'create type', s): f(JONAS, 'create type (kan ikke kjøres to ganger uten en do-blokk)', s); continue
        m = re.match(r'create (policy|trigger) ' + NAME, s)
        if m and not any(re.match(r'drop %s if exists %s\b' % (m.group(1), re.escape(m.group(2))), x) for x in sts):
            f(STOPP, 'ikke idempotent: create %s uten «drop %s if exists» først' % (m.group(1), m.group(1)), s); continue
    worst = max([a for a, _, _ in found] or [OK], key=RANK.get)
    return {'fil': name, 'svar': worst, 'funn': found}


def changed_files(base, head='HEAD'):
    out = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=AM', '%s...%s' % (base, head), '--', 'supabase/migrations/'],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    return sorted(f for f in out if f.endswith('.sql'))


def selftest():
    bad = []
    def eq(what, sql, want):
        got = check_text(sql)['svar']
        if got != want: bad.append('%s: %s, ventet %s %s' % (what, got, want, check_text(sql)['funn']))
    eq('ny tabell', 'create table if not exists public.x (id int primary key, n text);', OK)
    eq('ny kolonne', 'alter table public.x add column if not exists y int default 0;', OK)
    eq('ny kolonne null', 'alter table public.x add column if not exists y text;', OK)
    eq('funksjon erstattet', "create or replace function public.f(a int) returns int language sql as $$ delete from x; drop table y; select 1 $$;", OK)
    eq('kropp med tag', "create or replace function public.f() returns void language plpgsql as $fn$ begin truncate t; end $fn$;", OK)
    eq('indeks', 'create index if not exists x_i on public.x (n);', OK)
    eq('policy på nytt', 'drop policy if exists p on public.x; create policy p on public.x for select using (true);', OK)
    eq('constraint på nytt', "alter table public.x drop constraint if exists x_k_check; alter table public.x add constraint x_k_check check (k in ('a','b'));", OK)
    eq('seed', "insert into public.products (id) values ('a') on conflict (id) do update set id = excluded.id;", OK)
    eq('grant', 'revoke all on function public.f(int) from anon; grant execute on function public.f(int) to service_role;', OK)
    eq('kommentar med drop', "-- drop table x\ncomment on table public.x is 'drop table y; truncate z';", OK)
    eq('samme signatur', 'drop function if exists public.f(int); create function public.f(int) returns int language sql as $$ select 1 $$;', STOPP)
    eq('samme signatur, or replace', 'drop function if exists public.f(a int); create or replace function public.f(a int) returns int language sql as $$ select 1 $$;', OK)
    eq('truncate', 'truncate public.x;', STOPP)
    eq('drop table', 'drop table if exists public.x;', STOPP)
    eq('drop column', 'alter table public.x drop column y;', STOPP)
    eq('rename', 'alter table public.x rename column y to z;', STOPP)
    eq('type', 'alter table public.x alter column y type bigint;', STOPP)
    eq('create table uten if', 'create table public.x (id int);', STOPP)
    eq('add column uten if', 'alter table public.x add column y int;', STOPP)
    eq('create function uten replace', 'create function public.f() returns int language sql as $$ select 1 $$;', STOPP)
    eq('kontrakt', '-- kontrakt: save_put3 har ikke vært kalt på 30 dager (Jonas)\ndrop table if exists public.old;', JONAS)
    eq('ny signatur på save_put4', 'drop function if exists public.save_put4(text); create or replace function public.save_put4(text, bigint) returns void language sql as $$ select 1 $$;', JONAS)
    eq('update', "update public.x set n = 'a' where id = 1;", JONAS)
    eq('delete', 'delete from public.x where id = 1;', JONAS)
    eq('not null', 'alter table public.x alter column y set not null;', JONAS)
    eq('not null uten default', 'alter table public.x add column if not exists y int not null;', JONAS)
    eq('drop policy uten ny', 'drop policy if exists p on public.x;', JONAS)
    eq('insert uten on conflict', "insert into public.x (id) values (1);", JONAS)
    eq('cascade', 'drop view if exists public.v cascade; create or replace view public.v as select 1;', JONAS)
    eq('indeks concurrently', 'create index concurrently if not exists x_i on public.x (n);', JONAS)
    eq('unik indeks concurrently', 'create unique index concurrently x_u on public.x (n);', JONAS)
    eq('drop index concurrently', 'drop index concurrently if exists public.x_i;', JONAS)
    eq('vacuum', 'vacuum analyze public.x;', JONAS)
    eq('refresh concurrently er ok', 'refresh materialized view concurrently public.mv;', OK)
    eq('streng med semikolon', "comment on column public.x.y is 'a; truncate b';", OK)
    for b in bad: print('FEIL ' + b)
    print('OK migsjekk selftest' if not bad else 'FEIL migsjekk selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('files', nargs='*'); ap.add_argument('--base'); ap.add_argument('--head', default='HEAD')
    ap.add_argument('--json', action='store_true'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    files = a.files or (changed_files(a.base, a.head) if a.base else [])
    res = [check_text(open(os.path.join(ROOT, f) if not os.path.isabs(f) and not os.path.exists(f) else f, encoding='utf-8').read(), f) for f in files]
    for r in res:
        print('%-5s %s' % (r['svar'].upper(), r['fil']))
        for answer, why, s in r['funn']: print('      %s: %s  [%s]' % (answer, why, s[:110]))
    if not res: print('ingen migreringer å sjekke')
    worst = max([r['svar'] for r in res] or [OK], key=RANK.get)
    if a.json: print(json.dumps({'svar': worst, 'filer': [{'fil': r['fil'], 'svar': r['svar'], 'funn': [list(x) for x in r['funn']]} for r in res]}, ensure_ascii=False))
    return CODE[worst]


if __name__ == '__main__':
    sys.exit(main())
