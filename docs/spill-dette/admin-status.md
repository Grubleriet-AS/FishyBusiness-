# Admin: Status-siden og det nye utseendet (17.11.2026)

1. **Kjør migreringen på testprosjektet først:** `supabase/migrations/20261117120000_admin_trend.sql` i SQL Editor på `xlrjbqdhdymcdjkqkulx`. Den lager bare lesefunksjonen `admin_trend` (bare admin med totrinnskode, ingen tabeller, ingenting i spillet). Rett før slippet som tar med siden: det samme i produksjon. Uten den viser Status bare aktive, økter og spilletid, med en gul melding om migreringen.
2. **Se på test.detstorebla.no/admin/ på nettbrettet, stående og liggende:** Status er forsiden. Trykk og dra over en graf (tallene for dagen kommer opp), trykk på et nøkkeltall (forklaringen åpner seg), bytt periode, og prøv knappen for lys og mørk.
3. **Les retningen:** stemmer «Spillet går fremover / står stille / går tilbake» med det du selv mener om de siste ukene? Hvis ikke: si hvilket tall du synes skal veie mest.
