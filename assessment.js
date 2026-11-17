(() => {
  // Module Assessment practice: printable/checkable tests that mirror the question formats of the
  // Eureka Math² Grade 3 Module 3 assessment, with original stories and freshly generated numbers.
  const KEY = 'multiplication-trainer-v2', DEFAULTS = ['Luke', 'Blake', 'Leo', 'Brig'];
  const $ = id => document.getElementById(id);

  // ---------- saved students (shared with the rest of the site) ----------
  function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function blank(name) { return { id: uid(), name, mastery: {}, history: [], testHistory: [], assessmentHistory: [] }; }
  function load() {
    let x = null;
    try { x = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
    if (!x || !Array.isArray(x.students)) x = { students: [], activeStudent: null };
    for (const n of DEFAULTS) if (!x.students.some(s => String(s.name).toLowerCase() === n.toLowerCase())) x.students.push(blank(n));
    for (const s of x.students) { s.mastery = s.mastery || {}; s.history = s.history || []; s.testHistory = s.testHistory || []; s.assessmentHistory = s.assessmentHistory || []; }
    return x;
  }
  let data = load(), sid = data.activeStudent || data.students[0].id;
  function save() { data.activeStudent = sid; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {} }
  function student() { return data.students.find(s => s.id === sid) || data.students[0]; }
  function esc(x) { return String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---------- seeded random numbers, so a printed test and its key always match ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function tools(R) {
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const pick = arr => arr[Math.floor(R() * arr.length)];
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { ri, pick, shuffle };
  }

  // Normalize a typed equation so "63 / 7 = f", "63÷7=f" and "63 ÷ 7 = F" all compare equal.
  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[*·⋅✕✖]/g, '×').replace(/(\d)x(?=\d|[a-wyz])/g, '$1×').replace(/x(?=\d)/g, '×')
      .replace(/[\/:]/g, '÷').replace(/[−–]/g, '-');
  }
  const num = v => { const t = String(v || '').trim(); return /^-?\d+$/.test(t) ? Number(t) : NaN; };
  const inp = (id, wide) => `<input class="blank${wide ? ' wide' : ''}" data-id="${id}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="${wide ? 'text' : 'numeric'}" aria-label="answer">`;
  const NAMES = ['Maya', 'Theo', 'Ava', 'Jonah', 'Priya', 'Eli', 'Nora', 'Sam', 'Lena', 'Omar', 'Zoe', 'Caleb'];

  // ---------- question generators (one per assessment format) ----------
  // 1. Match each expression with its value.
  function qMatch(T) {
    let exprs;
    do {
      exprs = [];
      for (let i = 0; i < 2; i++) { const a = T.ri(6, 9), b = T.ri(6, 9); exprs.push({ t: `${a} × ${b}`, v: a * b }); }
      for (let i = 0; i < 2; i++) { const d = T.ri(6, 9), q = T.ri(2, 9); exprs.push({ t: `${q * d} ÷ ${d}`, v: q }); }
    } while (new Set(exprs.map(e => e.v)).size < 4);
    exprs = T.shuffle(exprs);
    const opts = T.shuffle(exprs.map(e => e.v));
    const html = `<div class="item-q"><span class="num">1.</span><span>Match each expression with its value.</span></div>
      <div class="match">${exprs.map((e, i) => `<span>${e.t}</span><select class="match-sel" data-id="m${i}" aria-label="value for ${e.t}"><option value="">—</option>${opts.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`).join('')}</div>`;
    return {
      html,
      parts: exprs.map((e, i) => ({ ids: [`m${i}`], check: g => num(g(`m${i}`)) === e.v })),
      explain: exprs.map(e => `${e.t} = ${e.v}`).join(' · '),
      key: exprs.map(e => `${e.t} → ${e.v}`).join(';  '),
    };
  }

  // 2. Complete the equation to describe the picture (equal groups).
  function qPicture(T) {
    const kind = T.pick([['cups', '✏️', 'pencils'], ['plates', '🍪', 'cookies'], ['bags', '🍎', 'apples'], ['vases', '🌷', 'flowers'], ['boxes', '🖍️', 'crayons']]);
    const g = T.ri(4, 8), s = T.ri(3, 6);
    const groups = Array.from({ length: g }, () => `<div class="group">${kind[1].repeat(s)}</div>`).join('');
    return {
      html: `<div class="item-q"><span class="num">2.</span><span>Complete the equation to describe the picture.</span></div>
        <div class="groups" aria-label="${g} ${kind[0]} with ${s} ${kind[2]} in each">${groups}</div>
        <div class="part"><div class="row">${inp('p_a')} × ${inp('p_b')} = ${inp('p_c')}</div></div>`,
      parts: [{ ids: ['p_a', 'p_b', 'p_c'], check: g2 => { const a = num(g2('p_a')), b = num(g2('p_b')), c = num(g2('p_c')); return a * b === c && [a, b].sort().join() === [g, s].sort().join(); } }],
      explain: `There are ${g} ${kind[0]} with ${s} ${kind[2]} in each: ${g} × ${s} = ${g * s}.`,
      key: `${g} × ${s} = ${g * s}  (${s} × ${g} = ${g * s} is also fine)`,
    };
  }

  // 3. Equal sharing story: division equation, multiplication equation (letter for the unknown), answer.
  function qShare(T) {
    const ctx = T.pick([['flowers', 'vases', 'f'], ['marbles', 'jars', 'm'], ['stickers', 'pages', 's'], ['books', 'shelves', 'b'], ['cards', 'piles', 'c']]);
    const name = T.pick(NAMES), g = T.ri(6, 9), q = T.ri(3, 9), total = g * q, L = ctx[2];
    const divOK = [`${total}÷${g}=${L}`, `${L}=${total}÷${g}`, `${total}÷${L}=${g}`, `${g}=${total}÷${L}`];
    const mulOK = [`${g}×${L}=${total}`, `${L}×${g}=${total}`, `${total}=${g}×${L}`, `${total}=${L}×${g}`];
    return {
      html: `<div class="item-q"><span class="num">3.</span><span>${name} puts a total of ${total} ${ctx[0]} into ${g} ${ctx[1]}. ${name} puts the same number of ${ctx[0]} into each of the ${ctx[1]}.</span></div>
        <div class="part"><div class="part-label">Part A</div><div class="part-text">Write a division equation that represents the number of ${ctx[0]} in each of the ${ctx[1]}. Use <i>${L}</i> to represent the unknown.</div>${inp('s_a', true)}</div>
        <div class="part"><div class="part-label">Part B</div><div class="part-text">Write a multiplication equation that represents the number of ${ctx[0]} in each of the ${ctx[1]}. Use <i>${L}</i> to represent the unknown.</div>${inp('s_b', true)}</div>
        <div class="part"><div class="part-label">Part C</div><div class="part-text">How many ${ctx[0]} are in each of the ${ctx[1]}?</div><div class="row">${name} puts ${inp('s_c')} ${ctx[0]} into each of the ${ctx[1]}.</div><div class="draw">Space to draw or work it out</div></div>`,
      parts: [
        { ids: ['s_a'], check: g2 => divOK.includes(norm(g2('s_a'))) },
        { ids: ['s_b'], check: g2 => mulOK.includes(norm(g2('s_b'))) },
        { ids: ['s_c'], check: g2 => num(g2('s_c')) === q },
      ],
      explain: `Part A: ${total} ÷ ${g} = ${L}. Part B: ${g} × ${L} = ${total}. Use the letter <i>${L}</i>, not the answer, in the equations. Part C: ${g} × ${q} = ${total}, so ${L} = ${q}.`,
      key: `A: ${total} ÷ ${g} = ${L}   B: ${g} × ${L} = ${total}  (or ${L} × ${g} = ${total})   C: ${q}`,
    };
  }

  // 4. Fill in the blanks: break apart a division.
  function qSplit(T) {
    const d = T.ri(6, 9), q = T.ri(6, 9), k = 5, rest = q - k, total = q * d;
    return {
      html: `<div class="item-q"><span class="num">4.</span><span>Fill in the blanks to find ${total} ÷ ${d}.</span></div>
        <div class="part"><div class="row">${total} ÷ ${d} = (${k * d} ÷ ${d}) + (${inp('d_a')} ÷ ${d})</div>
        <div class="row" style="padding-left:70px">= ${inp('d_b')} + ${inp('d_c')}</div>
        <div class="row" style="padding-left:70px">= ${inp('d_d')}</div></div>`,
      parts: [
        { ids: ['d_a'], check: g => num(g('d_a')) === rest * d },
        { ids: ['d_b', 'd_c'], check: g => num(g('d_b')) === k && num(g('d_c')) === rest },
        { ids: ['d_d'], check: g => num(g('d_d')) === q },
      ],
      explain: `${total} breaks apart into ${k * d} + ${rest * d}. ${k * d} ÷ ${d} = ${k} and ${rest * d} ÷ ${d} = ${rest}, so ${total} ÷ ${d} = ${k} + ${rest} = ${q}.`,
      key: `(${k * d} ÷ ${d}) + (${rest * d} ÷ ${d}) = ${k} + ${rest} = ${q}`,
    };
  }

  // 5. Is each expression equal to A × b? Circle Yes or No.
  function qYesNo(T) {
    let p, q, b;
    do { p = T.ri(2, 6); q = T.ri(2, 6); b = T.ri(2, 6); } while (p === q || p * q > 30 || p + q === p * q);
    const target = p * q * b;
    const cands = [
      { t: `(${p} + ${q}) × ${b}`, v: (p + q) * b }, { t: `(${p} × ${q}) × ${b}`, v: target },
      { t: `${p} + (${q} × ${b})`, v: p + q * b }, { t: `${p} × (${q} × ${b})`, v: target },
      { t: `${q} × (${p} × ${b})`, v: target }, { t: `(${p} × ${b}) + ${q}`, v: p * b + q },
      { t: `(${p} × ${b}) × ${q}`, v: target },
    ];
    const yes = T.shuffle(cands.filter(c => c.v === target)), no = T.shuffle(cands.filter(c => c.v !== target));
    const rows = T.shuffle([yes[0], yes[1], no[0], no[1]]);
    return {
      html: `<div class="item-q"><span class="num">5.</span><span>Is each expression equal to ${p * q} × ${b}? Choose Yes or No.</span></div>
        <div class="yn">${rows.map((r, i) => `<span>${r.t}</span><button type="button" data-yn="y${i}" data-v="yes">Yes</button><button type="button" data-yn="y${i}" data-v="no">No</button>`).join('')}</div>`,
      parts: rows.map((r, i) => ({ yn: `y${i}`, check: (g, yn) => yn[`y${i}`] === (r.v === target ? 'yes' : 'no') })),
      explain: `${p * q} × ${b} = ${target}. ${rows.map(r => `${r.t} = ${r.v}${r.v === target ? ' ✓' : ''}`).join(' · ')}. Do the part in parentheses first.`,
      key: rows.map(r => `${r.t}: ${r.v === target ? 'Yes' : 'No'}`).join(';  '),
    };
  }

  // 6. Two students write different expressions for the same picture. Explain why both are correct.
  function qBoth(T) {
    const g = T.ri(5, 8), s = T.ri(3, 6), total = g * s;
    const [n1, n2, owner] = T.shuffle(NAMES).slice(0, 3);
    const stacks = Array.from({ length: g }, () => `<div class="stack">${'<span></span>'.repeat(s)}</div>`).join('');
    const opts = T.shuffle([
      { ok: true, t: `${g} × ${s} finds all ${total} books: ${g} stacks with ${s} books in each. ${total} ÷ ${g} = ${s} splits the ${total} books into ${g} equal stacks and finds ${s} books in each stack. Both describe the same ${g} equal groups of ${s}.` },
      { ok: false, t: `Both expressions equal ${total}, so they are the same.` },
      { ok: false, t: `Only ${n1} is correct, because you can't use division to describe a picture of groups.` },
      { ok: false, t: `${total} ÷ ${g} is correct because there are ${total} stacks of books.` },
    ]);
    return {
      html: `<div class="item-q"><span class="num">6.</span><span>${owner} has the books shown.</span></div>
        <div class="groups" aria-label="${g} stacks of ${s} books">${stacks}</div>
        <div class="part"><div class="part-text">${n1} says that the expression ${g} × ${s} represents the books. ${n2} says that the expression ${total} ÷ ${g} represents the books.</div>
        <div class="row">How many books are there in all? ${inp('b_t')}</div>
        <div class="part-text" style="margin-top:10px">Which explanation shows why they are both correct?</div>
        <div class="choices">${opts.map((o, i) => `<label class="choice" data-choice="${i}"><input type="radio" name="both" value="${i}"><span>${esc(o.t)}</span></label>`).join('')}</div>
        <div class="part-text" style="margin-top:10px">Explain it in your own words (not scored):</div>${inp('b_own', true).replace('class="blank wide"', 'class="blank wide" style="width:100%"')}</div>`,
      parts: [
        { ids: ['b_t'], check: g2 => num(g2('b_t')) === total },
        { radio: 'both', check: (g2, yn, radio) => radio('both') !== null && opts[radio('both')].ok, choiceOk: opts.findIndex(o => o.ok) },
      ],
      explain: `${g} × ${s} = ${total} is the total. ${total} ÷ ${g} = ${s} is how many are in each stack. Multiplication and division describe the same equal groups: ${g} × ${s} = ${total} and ${total} ÷ ${g} = ${s}.`,
      key: `${total} books. ${g} × ${s} = ${total} (total); ${total} ÷ ${g} = ${s} (books in each of ${g} equal stacks).`,
    };
  }

  // 7. Use the multiplication table to find a 2-digit × 1-digit product (break apart the teen number).
  function qTable(T) {
    const n = T.ri(11, 19), m = T.ri(3, 9), name = T.pick(NAMES);
    let tbl = '<tr><th>×</th>' + Array.from({ length: 10 }, (_, j) => `<th>${j + 1}</th>`).join('') + '</tr>';
    for (let i = 1; i <= 10; i++) tbl += `<tr><th>${i}</th>${Array.from({ length: 10 }, (_, j) => `<td>${i * (j + 1)}</td>`).join('')}</tr>`;
    return {
      html: `<div class="item-q"><span class="num">7.</span><span>${name} wants to find ${n} × ${m}. The table only goes up to 10.</span></div>
        <div class="table-wrap"><table class="mt">${tbl}</table></div>
        <div class="part"><div class="part-label">Part A</div><div class="part-text">How can ${name} use the multiplication table to find ${n} × ${m}?</div>
        <div class="row">${name} can find ${inp('t_a')} × ${m} and ${inp('t_b')} × ${m}, then add the two products.</div></div>
        <div class="part"><div class="part-label">Part B</div><div class="row">${n} × ${m} = ${inp('t_c')}</div></div>`,
      parts: [
        { ids: ['t_a', 't_b'], check: g => { const a = num(g('t_a')), b = num(g('t_b')); return a >= 1 && b >= 1 && a <= 10 && b <= 10 && a + b === n; } },
        { ids: ['t_c'], check: g => num(g('t_c')) === n * m },
      ],
      explain: `Break ${n} into 10 + ${n - 10}. 10 × ${m} = ${10 * m} and ${n - 10} × ${m} = ${(n - 10) * m}. ${10 * m} + ${(n - 10) * m} = ${n * m}.`,
      key: `A: e.g. 10 × ${m} and ${n - 10} × ${m} (any two numbers up to 10 that add to ${n}).   B: ${n * m}`,
    };
  }

  // 8. Two-step word problem: an array, then "fewer than" / "more than".
  function qTwoStep(T) {
    const thing = T.pick([['shells', '🐚'], ['stickers', '⭐'], ['marbles', '🔵'], ['stamps', '✉️'], ['rocks', '🪨']]);
    const [a, b] = T.shuffle(NAMES).slice(0, 2);
    let r, c, d, rel, other;
    do {
      r = T.ri(3, 9); c = T.ri(3, 9); rel = T.pick(['fewer', 'more']); d = T.ri(10, 35);
      other = rel === 'fewer' ? r * c + d : r * c - d;
    } while (r === c || other < 5);
    return {
      html: `<div class="item-q"><span class="num">8.</span><span>${a} and ${b} collect ${thing[0]}. ${a} arranges a collection of ${thing[0]} into ${r} rows of ${c}. ${a} has ${d} ${rel} ${thing[0]} than ${b} has.</span></div>
        <div class="part"><div class="part-text">How many ${thing[0]} does ${b} have?</div><div class="row">${b} has ${inp('w_a')} ${thing[0]}.</div><div class="draw">Space to draw or work it out</div></div>`,
      parts: [{ ids: ['w_a'], check: g => num(g('w_a')) === other }],
      explain: `${a} has ${r} × ${c} = ${r * c} ${thing[0]}. ${a} has ${d} ${rel} than ${b}, so ${b} has ${rel === 'fewer' ? `${d} more: ${r * c} + ${d}` : `${d} fewer: ${r * c} − ${d}`} = ${other}.`,
      key: `${r} × ${c} = ${r * c};  ${rel === 'fewer' ? `${r * c} + ${d}` : `${r * c} − ${d}`} = ${other}`,
    };
  }

  const MODULES = { g3m3: { title: 'Grade 3 · Module 3', build: T => [qMatch(T), qPicture(T), qShare(T), qSplit(T), qYesNo(T), qBoth(T), qTable(T), qTwoStep(T)] } };

  // ---------- page state ----------
  let seed = 0, items = [], yn = {}, checked = false, lastText = null;

  function newSeed() { return Math.floor(Math.random() * 90000) + 10000; }
  function render() {
    const mod = MODULES[$('module').value];
    items = mod.build(tools(rng(seed)));
    yn = {}; checked = false;
    $('sheet').classList.remove('checked');
    $('items').innerHTML = items.map((it, i) => `<div class="item" data-item="${i}">${it.html}<div class="feedback-box" data-fb="${i}"></div></div>`).join('');
    $('test-id').textContent = `${mod.title} · Test #${seed}`;
    $('key-id').textContent = `${mod.title} · Test #${seed}`;
    $('name-line').textContent = '';
    $('key-list').innerHTML = items.map(it => `<li>${esc(it.key)}</li>`).join('');
    $('score-card').style.display = 'none';
    $('check').disabled = false;
    try { history.replaceState(null, '', '#t=' + seed); } catch (_) {}
  }
  function get(id) { const el = document.querySelector(`[data-id="${id}"]`); return el ? el.value : ''; }
  function radio(name) { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? Number(el.value) : null; }

  function check() {
    if (checked) return;
    let ok = 0, total = 0;
    const missed = [];
    items.forEach((it, i) => {
      let allOk = true;
      for (const p of it.parts) {
        const good = !!p.check(get, yn, radio);
        total++; if (good) ok++; else allOk = false;
        for (const id of p.ids || []) { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.classList.add(good ? 'mark-ok' : 'mark-bad'); }
        if (p.yn) document.querySelectorAll(`[data-yn="${p.yn}"]`).forEach(b => { if (b.classList.contains('on') || !yn[p.yn]) b.classList.add(good ? 'mark-ok' : 'mark-bad'); });
        if (p.radio) { const sel = radio(p.radio); document.querySelectorAll('[data-choice]').forEach(l => { const k = Number(l.dataset.choice); if (k === p.choiceOk) l.classList.add('mark-ok'); else if (k === sel) l.classList.add('mark-bad'); }); }
      }
      const fb = document.querySelector(`[data-fb="${i}"]`);
      fb.className = 'feedback-box' + (allOk ? ' ok' : '');
      fb.innerHTML = allOk ? '✓ All correct. ' + it.explain : '<strong>How to solve it:</strong> ' + it.explain;
      if (!allOk) missed.push(i + 1);
    });
    checked = true;
    $('keypad').classList.remove('show');
    $('sheet').classList.add('checked');
    $('check').disabled = true;
    const pct = Math.round(ok / total * 100);
    $('score-big').textContent = `${ok} / ${total}`;
    $('score-text').textContent = missed.length ? `${pct}% of the answer parts are correct. Look again at question${missed.length > 1 ? 's' : ''} ${missed.join(', ')}.` : `${pct}% — every part correct! 🎉`;
    $('score-card').style.display = 'block';
    $('score-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    student().assessmentHistory.push({ at: new Date().toISOString(), module: $('module').value, test: seed, score: ok, total, missed });
    save(); renderHistory();
  }

  function renderHistory() {
    const h = student().assessmentHistory.slice(-8).reverse();
    $('history').innerHTML = h.length ? h.map(x => `<div class="history-row"><strong>${x.score} / ${x.total}</strong><span>Test #${x.test} · ${new Date(x.at).toLocaleDateString()}${x.missed.length ? ' · review Q' + x.missed.join(', ') : ' · perfect'}</span></div>`).join('') : '<div class="note-small">No practice tests yet.</div>';
  }
  function renderStudents() {
    $('student').innerHTML = '';
    for (const s of data.students) { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; $('student').appendChild(o); }
    $('student').value = sid;
  }

  // ---------- events ----------
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-yn]');
    if (!b || checked) return;
    yn[b.dataset.yn] = b.dataset.v;
    document.querySelectorAll(`[data-yn="${b.dataset.yn}"]`).forEach(x => x.classList.toggle('on', x === b));
  });
  document.addEventListener('focusin', ev => { const eq = ev.target.matches('.blank.wide') && ev.target.dataset.id !== 'b_own'; if (eq) lastText = ev.target; $('keypad').classList.toggle('show', eq && !checked); });
  $('keypad').addEventListener('mousedown', ev => ev.preventDefault());
  $('keypad').addEventListener('click', ev => {
    const b = ev.target.closest('[data-sym]');
    if (!b || !lastText || checked) return;
    const el = lastText, s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length, sym = ` ${b.dataset.sym} `;
    el.value = el.value.slice(0, s) + sym + el.value.slice(e);
    el.focus(); el.setSelectionRange(s + sym.length, s + sym.length);
  });
  $('student').addEventListener('change', () => { sid = $('student').value; save(); renderHistory(); });
  $('module').addEventListener('change', () => { seed = newSeed(); render(); });
  $('new-test').addEventListener('click', () => { seed = newSeed(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('new-test-2').addEventListener('click', () => { seed = newSeed(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('retry').addEventListener('click', () => { render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('check').addEventListener('click', check);
  $('print').addEventListener('click', () => { $('key-sheet').classList.toggle('show', $('with-key').checked); window.print(); });
  window.addEventListener('afterprint', () => $('key-sheet').classList.remove('show'));

  const m = location.hash.match(/t=(\d+)/);
  seed = m ? Number(m[1]) : newSeed();
  renderStudents(); render(); renderHistory();
})();
