# Utrullingen sjekker seg selv: kjør setup.sh på nytt på spillserveren

Reléet byttes nå med helsesjekk og ruller tilbake selv (`docs/systemer/publisering.md`, «Utrullingen sjekker seg selv»). Det virker først når serveren har det nye oppsettet:

1. Som root på `ubuntu-8gb-hel1-1` (der spillet og reléet ligger), etter at endringen er på arbeidsgrenen:
   `curl -fsSL https://raw.githubusercontent.com/average01101010/FishyBusiness-/ccr-5e1ba2f4-pusvyd/tools/server/setup.sh | bash -s detstorebla.no`
2. Til slutt skal den skrive `The relay: active; {"v":"…","result":"ok",…}`. Står det `failed` eller noe annet enn `active`: `journalctl -u dsb-rt-reload -u dsb-rt -n 50`, og si fra.
3. Ingen omstart av reléet utover én kort (spillene kobler seg til igjen av seg selv), og ingenting med spillerdata.

Før det er gjort, er reléet-steget i neste slipp gult («wrote no rt/STATUS») og reléet byttes som før, uten sjekk.
