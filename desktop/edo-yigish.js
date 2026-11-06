/**
 * edo.ijro.uz sahifasi ICHIDA ishlaydi (chrome.scripting.executeScript, world: MAIN).
 * Sizning kirgan sessiyangizdan foydalanadi — parol hech qayerda saqlanmaydi.
 * Funksiya o'zi-o'zidan yetarli bo'lishi shart (tashqi o'zgaruvchilarsiz).
 *
 * @param {string[]} bor     Jadvalda to'liq saqlangan topshiriq ID lari (qayta yuklamaslik uchun)
 * @param {number}   maxFayl Bir martada nechta yangi hujjat tafsiloti + PDF olinsin
 * @param {boolean}  toliqTarix true — eski (bajarilgan) hujjatlarni ham hammasini olish (birinchi marta)
 */
async function edoYigish(bor, maxFayl, toliqTarix) {
  /* ---------- MessagePack (edo API shu formatda ishlaydi) ---------- */
  const te = new TextEncoder(), td = new TextDecoder();
  function mpe(v) {
    const out = [];
    const w = (...b) => { for (const x of b) out.push(x); };
    const u16 = n => w(n >> 8 & 255, n & 255);
    const u32 = n => w(n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255);
    (function e(v) {
      if (v === null || v === undefined) return w(0xc0);
      if (v === true) return w(0xc3);
      if (v === false) return w(0xc2);
      if (typeof v === 'number') {
        if (Number.isInteger(v) && v >= 0 && v < 0x80) return w(v);
        if (Number.isInteger(v) && v < 0 && v >= -32) return w(v & 255);
        if (Number.isInteger(v) && v >= 0 && v <= 0xffffffff) { w(0xce); return u32(v); }
        const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return w(0xcb, ...b);
      }
      if (typeof v === 'string') {
        const b = te.encode(v);
        if (b.length < 32) w(0xa0 | b.length); else if (b.length < 256) w(0xd9, b.length); else { w(0xda); u16(b.length); }
        return w(...b);
      }
      if (Array.isArray(v)) { if (v.length < 16) w(0x90 | v.length); else { w(0xdc); u16(v.length); } v.forEach(e); return; }
      const k = Object.keys(v);
      if (k.length < 16) w(0x80 | k.length); else { w(0xde); u16(k.length); }
      k.forEach(x => { e(x); e(v[x]); });
    })(v);
    return new Uint8Array(out);
  }
  function mpd(buf) {
    const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    let p = 0;
    const str = n => { const s = td.decode(u.subarray(p, p + n)); p += n; return s; };
    const arr = n => { const a = []; for (let i = 0; i < n; i++) a.push(r()); return a; };
    const map = n => { const o = {}; for (let i = 0; i < n; i++) { const k = r(); o[k] = r(); } return o; };
    const bin = n => { const d = u.slice(p, p + n); p += n; return d; };
    function ext(n) {
      const t = dv.getInt8(p); p++;
      const d = u.subarray(p, p + n); p += n;
      const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
      if (t === 13) { // edo vaqt belgisi: ichida msgpack float64 (ms)
        if (n === 9 && d[0] === 0xcb) return { ms: v.getFloat64(1) };
        if (n === 8) return { ms: v.getFloat64(0) };
      }
      if (t === -1 && n === 4) return { ms: v.getUint32(0) * 1000 };
      return null;
    }
    function r() {
      const b = u[p++];
      if (b <= 0x7f) return b;
      if (b >= 0xe0) return b - 256;
      if ((b & 0xf0) === 0x80) return map(b & 15);
      if ((b & 0xf0) === 0x90) return arr(b & 15);
      if ((b & 0xe0) === 0xa0) return str(b & 31);
      switch (b) {
        case 0xc0: return null; case 0xc2: return false; case 0xc3: return true;
        case 0xc4: { const n = u[p]; p += 1; return bin(n); }
        case 0xc5: { const n = dv.getUint16(p); p += 2; return bin(n); }
        case 0xc6: { const n = dv.getUint32(p); p += 4; return bin(n); }
        case 0xca: { const v = dv.getFloat32(p); p += 4; return v; }
        case 0xcb: { const v = dv.getFloat64(p); p += 8; return v; }
        case 0xcc: return u[p++];
        case 0xcd: { const v = dv.getUint16(p); p += 2; return v; }
        case 0xce: { const v = dv.getUint32(p); p += 4; return v; }
        case 0xcf: { const v = Number(dv.getBigUint64(p)); p += 8; return v; }
        case 0xd0: { const v = dv.getInt8(p); p += 1; return v; }
        case 0xd1: { const v = dv.getInt16(p); p += 2; return v; }
        case 0xd2: { const v = dv.getInt32(p); p += 4; return v; }
        case 0xd3: { const v = Number(dv.getBigInt64(p)); p += 8; return v; }
        case 0xd9: { const n = u[p]; p += 1; return str(n); }
        case 0xda: { const n = dv.getUint16(p); p += 2; return str(n); }
        case 0xdb: { const n = dv.getUint32(p); p += 4; return str(n); }
        case 0xdc: { const n = dv.getUint16(p); p += 2; return arr(n); }
        case 0xdd: { const n = dv.getUint32(p); p += 4; return arr(n); }
        case 0xde: { const n = dv.getUint16(p); p += 2; return map(n); }
        case 0xdf: { const n = dv.getUint32(p); p += 4; return map(n); }
        case 0xd4: return ext(1); case 0xd5: return ext(2); case 0xd6: return ext(4);
        case 0xd7: return ext(8); case 0xd8: return ext(16);
        case 0xc7: { const n = u[p]; p += 1; return ext(n); }
        case 0xc8: { const n = dv.getUint16(p); p += 2; return ext(n); }
        case 0xc9: { const n = dv.getUint32(p); p += 4; return ext(n); }
      }
      throw new Error('msgpack: noma\'lum bayt ' + b.toString(16));
    }
    return r();
  }

  /* ---------- edo API chaqiruvi ---------- */
  const sid = localStorage.getItem('session_id');
  if (!sid || /login|auth/.test(location.pathname)) return { login: false };

  async function api(path, body) {
    const id = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await fetch('/api/' + path, {
      method: 'POST', credentials: 'include',
      headers: {
        'Accept': 'application/json', 'Content-Type': 'application/octet-stream',
        'X-Request-Id': id, 'X-Year': String(new Date().getFullYear()), 'X-Session-Id': sid
      },
      body: mpe(body)
    });
    if (r.status === 401 || r.status === 403) { const e = new Error('LOGIN'); e.login = true; throw e; }
    if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
    return mpd(await r.arrayBuffer());
  }

  const umumiy = {
    limit: 50, page: 1, statuses: [], days_left: null, document_type_id: null, journal_id: null,
    task_document_content: null, root_document_registration_number: null, root_document_sender_number: null,
    document_number: null, sender_db_name: null, signed_by: null, keyword: null, date_filter: null,
    from_at: null, to_at: null, child_status: null, is_exact: false, is_main_recipient: false,
    with_due_date: false, without_due_date: false, is_parent_not_sent: false, from_prev_years: false, offset: 0
  };

  const tashkent = ms => {           // ms -> 'yyyy-mm-dd' (Toshkent vaqti); "muddatsiz" belgilari -> ''
    const n = Number(ms);
    if (!isFinite(n) || n < 1e12 || n > 4e12) return '';
    return new Date(n + 5 * 3600e3).toISOString().slice(0, 10);
  };
  const nom = j => j ? (j.name_uz_lat || j.name_uz || j.name_ru || '') : '';

  const BOLIMLAR = {
    ijro: ['workflow/task/v2/incoming-list-by-recipient',
      { ...umumiy, sender_user_id: null, internal_doc_type_ids: [], label_ids: [], doc_label_ids: [], last_recipient_added: true }],
    murojaat: ['workflow/task/v3/inbox-appeal-list', { ...umumiy, last_recipient_added: false }],
    malumot: ['workflow/task/v2/incoming-list-by-recipient', {
      limit: 50, page: 1, type: 2, statuses: [], document_type_id: null, internal_doc_type_ids: [],
      task_document_content: null, journal_id: null, root_document_registration_number: null,
      root_document_sender_number: null, document_number: null, sender_db_name: null, keyword: null,
      date_filter: null, from_at: null, to_at: null, is_exact: false, is_main_recipient: false,
      last_recipient_added: false, is_parent_not_sent: false, from_prev_years: false, offset: 0 }]
  };

  // Sahifalab olish (edo bir martada ko'pi bilan 50 ta beradi)
  async function sahifalab(path, body, maxSahifa) {
    let all = [];
    for (let page = 1; page <= maxSahifa; page++) {
      const r = await api(path, { ...body, limit: 50, page, offset: (page - 1) * 50 });
      if (!Array.isArray(r)) throw new Error(path + ': kutilmagan javob');
      all = all.concat(r);
      if (r.length < 50) break;
    }
    return all;
  }
  // toliqTarix: hamma hujjatlar (birinchi marta); aks holda: bajarilmaganlar HAMMASI + oxirgi 30 tasi
  async function bolimniOl(path, body) {
    if (toliqTarix) return { royxat: await sahifalab(path, body, 40), faolToliq: true };
    const [faol, oxirgi] = await Promise.all([
      sahifalab(path, { ...body, statuses: [0, 10] }, 10),
      api(path, { ...body, limit: 30 })
    ]);
    const m = new Map();
    faol.concat(Array.isArray(oxirgi) ? oxirgi : []).forEach(x => x && m.set(x.task_id, x));
    return { royxat: [...m.values()], faolToliq: true };
  }

  const natija = {};
  try {
    const nomlar = Object.keys(BOLIMLAR);
    const javob = await Promise.all(nomlar.map(b => bolimniOl(...BOLIMLAR[b]).catch(e => {
      if (e.login) throw e;
      return { royxat: [], faolToliq: false, xato: String(e.message || e) };
    })));
    nomlar.forEach((b, i) => { natija[b] = javob[i]; });
  } catch (e) {
    if (e.login) return { login: false };
    throw e;
  }

  const borSet = new Set(bor || []);
  const items = [];
  const korildi = new Set();

  function qosh(x, bolim) {
    if (!x || !x.task_id || !x.document || korildi.has(x.task_id)) return;
    korildi.add(x.task_id);
    const yaratildi = Math.round(x.task_created_at_ms || 0);
    const d = x.document;
    const muddatMs = x.task_due_date_ms || (x.due_date && x.due_date.ms) || 0;
    items.push({
      id: x.task_id, bolim,
      doc_id: d.id, recipient_id: x.recipient_id,
      reg: d.registration_number || '', raqam: d.document_number || '',
      sana: typeof d.document_date === 'string' ? d.document_date.slice(0, 10) : tashkent(d.document_date && d.document_date.ms),
      kimdan: bolim === 'murojaat' ? nom(x.root_document && x.root_document.sender_db_json) || nom(d.sender_db_json)
                                   : nom(d.sender_db_json) || nom(x.root_document && x.root_document.sender_db_json),
      rez: String(x.contents || '').trim(),
      muddat: tashkent(muddatMs),
      holat: Number(x.status) || 0,
      oqilgan: !!x.read_time,
      ijrochilar: (x.main_recipients || []).map(m => m.short_name).filter(Boolean).join(', '),
      kelganMs: yaratildi
    });
  }
  Object.keys(natija).forEach(b => natija[b].royxat.forEach(x => qosh(x, b)));

  function b64(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // Tafsilot (qisqacha mazmun + PDF): avval bajarilmaganlar, keyin yangilari
  const navbat = items.filter(it => !borSet.has(it.id))
    .sort((a, b) => ((a.holat < 20 ? 0 : 1) - (b.holat < 20 ? 0 : 1)) || (b.kelganMs - a.kelganMs));
  for (const it of navbat.slice(0, maxFayl)) {
    try {
      const d = await api('workflow/document/find-by-id', { document_id: it.doc_id });
      it.mazmun = String(d.brief_content || '').trim();
      it.jurnal = (d.details && d.details.journal_json && d.details.journal_json.name_uz_lat) || '—';
      const f = (d.files || []).find(f => /pdf/i.test(f.type || f.name || '')) || (d.files || [])[0];
      if (f && f.size < 10 * 1024 * 1024) {
        const pr = await api('v2/files/presigned-url/download', { file_id: f.id });
        const r = await fetch(pr.url);
        if (r.ok) it.fayl = { nom: f.name || (it.reg + '.pdf'), mime: f.type || 'application/pdf', b64: b64(await r.arrayBuffer()) };
      }
    } catch (e) {
      if (e.login) return { login: false };
      it.xato = String(e.message || e);
    }
  }

  return {
    login: true, items,
    faolToliq: Object.fromEntries(Object.keys(natija).map(b => [b, natija[b].faolToliq])),
    xatolar: Object.keys(natija).filter(b => natija[b].xato).map(b => b + ': ' + natija[b].xato),
    navbatdaQoldi: Math.max(0, navbat.length - maxFayl)
  };
}
