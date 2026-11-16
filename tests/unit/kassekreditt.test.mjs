// The overdraft comes with sea time (Jonas 16.11.2026, before the launch: «Kassekreditt etter fartstid»; core/03-simulation.js kkOpen,
// kkLimit): a new sole proprietor has none, so spendable() is the current account; with BANK.kkFsY years of sea time it is 10 % of the
// fleet's value and at least 20 000 kr; a limited company has it at once.
export default function (t){
  const K = t.K;
  K.set('S', K.newState()); const S = K.get('S'); S.cash = 5000; S.fs = {p:0, rest:0, away:0};
  t.ok(!K.kkOpen() && K.kkLimit() === 0 && K.spendable() === 5000, 'ny spiller (ENK, ingen fartstid): ingen kassekreditt, bare det som står på kontoen', {lim:K.kkLimit(), sp:K.spendable()});
  S.fs.p = K.fsNeed(K.BANK.kkFsY) - 1;
  t.ok(!K.kkOpen() && K.kkLimit() === 0, 'like før ' + K.BANK.kkFsY + ' års fartstid: fortsatt ingen');
  S.fs.p = K.fsNeed(K.BANK.kkFsY);
  t.ok(K.kkOpen() && K.kkLimit() >= 20000 && K.spendable() === 5000 + K.kkLimit(), K.BANK.kkFsY + ' års fartstid: kassekreditten er der, minst 20 000 kr', K.kkLimit());
  S.fs.p = 0; S.form = 'AS';
  t.ok(K.kkOpen() && K.kkLimit() >= 20000, 'aksjeselskap: kassekreditt med en gang', K.kkLimit());
}
