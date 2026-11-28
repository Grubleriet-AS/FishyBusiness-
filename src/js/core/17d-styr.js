// ===== STYRINGEN: SHE IS CARRIED ALONG THE BANE WHILE THE GAME IS LOOKED AT (Autonav 2.0 F3, steg 143, 27.11.2026) =====
// Jonas 27.11.2026: «Vi må bare fikse denne autonav-funksjonen slik at den fungerer for alle hver gang. Den må funke 100% feilfritt»,
// and his choice 10 the same day: «Ført langs banen» (in place of choice 3, «Fysikk med hjelp»). The bane (17b-bane.js) is what
// the planner checked her whole hull along (17c-plan.js). The minute step follows it by the clock when the game is shut (baneSail);
// here the boat model's tick does the same while it is open (baneTick): the same place, heading and speed at the same time, so what
// was checked free is what is sailed, whichever of the two moves her. The manoeuvring model (16b-dyn.js dynAuto: the rudder, the
// propeller, the wind's push) has her only where the plan has no bane, and when the player steers himself.
// One call in 16b-dyn.js dynTick, before dynAuto; the minute's books while the model has her leave a plan with a bane as it is
// (dynMinute: no detours laid into it, obsSail and landSail, which would make it a plan without a bane).
function styrTick(b, d, dtG){ const pl = S.plan; if (!pl || !pl.b2) return false;
  const x0 = d.X, y0 = d.Y; if (!baneTick(pl, b, d, dtG)) return false;
  DYN.nm = (DYN.nm || 0) + Math.hypot(d.X - x0, d.Y - y0) / 1852; return true; }
// whether the plan has a bane where she is (the minute's books and the views ask)
function styrOn(pl){ return !!(pl && pl.b2 && baneLeg(pl)); }
