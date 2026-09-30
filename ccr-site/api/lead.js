// Vercel serverless function: receives a roller-quote lead from the TCO calculator
// and forwards it (readable summary + full data) to LEAD_WEBHOOK_URL
// (works with Formspree, Zapier, Make, HubSpot forms, Slack webhooks, etc).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  const c = b.contact || {};
  if (!c.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || '') || !c.consent) {
    return res.status(400).json({ error: 'Name, valid email and consent are required' });
  }
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: 'LEAD_WEBHOOK_URL is not configured' });

  const i = b.inputs || {}, r = b.results || {};
  const n = (x) => (x === undefined || x === null || Number.isNaN(x) ? '-' : Math.round(x).toLocaleString('en-US'));
  const cur = i.currency || '';
  const lines = [
    `Request: ${b.intent === 'email' ? 'Email me these results' : 'Roller quote'}`,
    `Interested in: ${c.interest || '-'}`,
    `Copy of results requested: ${c.sendCopy ? 'Yes' : 'No'}`,
    `Company: ${c.company || '-'}  |  Phone: ${c.phone || '-'}`,
    `Notes: ${c.notes || '-'}`,
    '',
    '--- Calculator inputs ---',
    `Rollers: ${n(i.numRollers)}  |  Steel weight: ${i.steelWeightKg || '-'} kg each  |  Position: ${i.rollerPosition || '-'}`,
    `Energy basis: ${i.energyBasis || '-'}  |  Motor: ${i.motorKw || '-'} kW  |  Hours/day: ${i.hoursPerDay || '-'}  |  Tariff: ${i.electricityCost || '-'}`,
    `Mode: ${i.mode || '-'}  |  Currency: ${cur || '-'}  |  Steel price: ${n(i.steelPrice)}  |  Composite price: ${n(i.compositePrice)}`,
    `Life steel/composite: ${i.steelLifeYears || '-'}/${i.compositeLifeYears || '-'} yr  |  Horizon: ${i.timeHorizonYears || '-'} yr`,
    b.exampleId ? `NOTE: customer used illustrative example "${b.exampleId}" values` : '',
    '',
    '--- Results shown ---',
    `Weight removed: ${n(r.removed)} kg  |  Steel ${n(r.steelTot)} kg vs composite ${n(r.compTot)} kg`,
    r.S && r.C ? `TCO ${r.H} yr: steel ${cur} ${n(r.S.total)} vs composite ${cur} ${n(r.C.total)}  |  Savings ${cur} ${n(r.savings)}` : 'TCO: not calculated (quick mode or missing inputs)',
    r.S ? `Payback: ${r.payMonths === null ? 'none within horizon' : r.payMonths + ' months'}` : '',
    '',
    `Page: ${b.page || '-'}  |  Sent: ${b.ts || '-'}`,
    b.disclaimer && b.disclaimer.exportFooter ? `\n${b.disclaimer.exportFooter}` : '',
  ].filter((l, k, a) => !(l === '' && a[k - 1] === ''));

  const payload = {
    name: c.name, email: c.email, company: c.company || '', phone: c.phone || '',
    interest: c.interest || '', notes: c.notes || '', sendCopy: !!c.sendCopy,
    _subject: `CCR TCO calculator — ${c.interest || 'roller quote'} — ${c.name}`,
    message: lines.join('\n'),
    calculator_json: JSON.stringify({ inputs: i, results: r, exampleId: b.exampleId, assumptions: b.assumptions, page: b.page, ts: b.ts }),
  };
  try {
    const out = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    if (!out.ok) return res.status(502).json({ error: 'Webhook rejected the lead' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach webhook' });
  }
};
