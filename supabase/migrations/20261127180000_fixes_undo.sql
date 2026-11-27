-- A second kind of correction, 'undo' (27.11.2026, Julian): the same as 'undo_buy' (core/03-simulation.js undoBuyApply), but a kind the
-- released versions before it do not know. A game of an older version skips a kind it does not know and leaves the row open
-- (ui/10w-fix.js), where it closed an 'undo_buy' row holding fields it did not know (inn, upg, gearKr) as «bad»: a page left open on
-- the version before the release did that to Julian's row 3 at 13:55. New rows are 'undo'; 'undo_buy' stays for the rows and versions
-- that have it. Only the check on kind is widened; nothing else changes.

alter table public.fixes drop constraint if exists fixes_kind_check;
alter table public.fixes add constraint fixes_kind_check check (kind in ('undo_buy', 'undo'));
