-- The save gate (tools/saves/fetch.py on the gate's server) reads the saves and their history through the API with the service key;
-- the history (save_hist, 1 827 saves, 66 MB on 18.11.2026) took more than the 8 s the API gives a statement, and the release that day
-- was stopped with HTTP 500 («canceling statement due to statement timeout»). The service role gets 60 s; the players' roles (anon,
-- authenticated) keep 8 s. Jonas ran it in production 18.11.2026 (SQL Editor); run it on the test project too.
alter role service_role set statement_timeout = '60s';
notify pgrst, 'reload config';
