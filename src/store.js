/* ===== SALVAMENTO: rascunhos, propostas salvas, autosave e arquivo .json ===== */
(function(){
  var KEY = 'adm_propostas_v1', AUTO = 'adm_autosave_v1', cur = null, restoring = false, timer = null, okStorage = true;
  function rd(k){ try { return localStorage.getItem(k); } catch (e) { okStorage = false; return null; } }
  function wr(k, v){ try { localStorage.setItem(k, v); return true; } catch (e) { okStorage = false; return false; } }
  function rm(k){ try { localStorage.removeItem(k); } catch (e) {} }
  function lista(){ try { return JSON.parse(rd(KEY) || '[]'); } catch (e) { return []; } }
  function gravaLista(l){ return wr(KEY, JSON.stringify(l)); }
  function two(n){ return (n < 10 ? '0' : '') + n; }
  function quando(ts){ var d = new Date(ts); return two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }

  function snapshot(){
    var f = {}, c = {}, a = [];
    document.querySelectorAll('input, select, textarea').forEach(function(el){
      var id = el.id;
      if (!id || el.type === 'file' || /^r\d+_/.test(id) || /^mode_/.test(id)) return;
      if (el.type === 'checkbox') c[id] = el.checked;
      else { f[id] = el.value; if (el.classList.contains('auto')) a.push(id); }
    });
    var rows = Array.prototype.slice.call($('rows').children).map(function(r){
      return {g: $(r.id + '_g').value, d: $(r.id + '_d').value, v: $(r.id + '_v').value, m: $(r.id + '_m').value};
    });
    return {f: f, c: c, a: a, rows: rows};
  }
  function restore(s){
    restoring = true;
    try {
      document.querySelectorAll('.auto').forEach(function(el){ el.classList.remove('auto'); });
      Object.keys(s.f || {}).forEach(function(id){ var el = $(id); if (el) el.value = s.f[id]; });
      Object.keys(s.c || {}).forEach(function(id){ var el = $(id); if (el) { el.checked = !!s.c[id]; el.dispatchEvent(new Event('change')); } });
      (s.a || []).forEach(function(id){ var el = $(id); if (el) el.classList.add('auto'); });
      $('rows').innerHTML = '';
      (s.rows && s.rows.length ? s.rows : [{g:'sinal', v:'Na assinatura'}, {g:'saldo'}]).forEach(function(r){
        addRow(r.g, r.d, r.v); var last = $('rows').lastElementChild; $(last.id + '_m').value = r.m || '';
      });
      updateTotals();
    } finally { restoring = false; }
  }
  function titulo(s){
    var n = (s.f.p_nome || '').trim(), im = [s.f.im_cond, s.f.im_cidade].filter(Boolean).join(' · ');
    return (n || 'Sem nome') + (im ? ' — ' + im : '');
  }
  function aviso(kind, html){ showMsg(kind, html); }

  function salvar(status, silencioso){
    var s = snapshot(), l = lista(), agora = Date.now(), i;
    if (!cur) cur = 'p' + agora.toString(36);
    var rec = {id: cur, status: status, savedAt: agora, title: titulo(s), data: s};
    for (i = 0; i < l.length; i++) if (l[i].id === cur) break;
    if (i < l.length) l[i] = rec; else l.unshift(rec);
    var ok = gravaLista(l);
    if (ok) rm(AUTO);
    desenharLista();
    marca(ok ? 'Salvo às ' + quando(agora).slice(11) : 'Não foi possível salvar neste navegador');
    return {ok: ok, rec: rec};
  }
  function marca(t){ var h = $('save_hint'); if (h) h.textContent = t; }

  function baixarJson(rec){
    var blob = new Blob([JSON.stringify({app:'adm-proposta', v:1, record:rec}, null, 1)], {type:'application/json'});
    var nome = 'Proposta_' + (slug(rec.data.f.p_nome || 'sem_nome') || 'sem_nome') + '_' + (rec.status === 'rascunho' ? 'rascunho' : 'salva') + '.json';
    return saveBlob(blob, nome);
  }

  function aposSalvar(status){
    var r = salvar(status);
    var rotulo = status === 'rascunho' ? 'Rascunho' : 'Proposta';
    if (r.ok) aviso('ok', '<strong>' + rotulo + ' salvo neste navegador.</strong> Para abrir depois, use “Propostas salvas” no topo. Se for trocar de aparelho ou limpar o navegador, baixe uma cópia.<br><button type="button" class="ghost" id="btn_json">Baixar cópia (.json)</button>');
    else aviso('bad', '<strong>Este ambiente não permite salvar no navegador.</strong> Baixe a cópia em arquivo para não perder o que foi preenchido.<br><button type="button" class="ghost" id="btn_json">Baixar cópia (.json)</button>');
    lastRec = r.rec;
  }
  var lastRec = null;

  function desenharLista(){
    var l = lista(), box = $('saved_list');
    $('saved_n').textContent = l.length;
    if (!box) return;
    if (!l.length) { box.innerHTML = '<p class="muted">Nenhuma proposta salva neste navegador ainda.</p>'; return; }
    box.innerHTML = l.map(function(r){
      var st = {rascunho:'Rascunho', salva:'Salva', pdf:'PDF gerado'}[r.status] || r.status;
      return '<div class="srow"><div><b>' + escH(r.title) + '</b><small>' + st + ' · ' + quando(r.savedAt) + '</small></div>' +
        '<div class="sbtn"><button type="button" class="ghost" data-open="' + r.id + '">Abrir</button><button type="button" class="ghost" data-json="' + r.id + '">.json</button><button type="button" class="ghost" data-del="' + r.id + '">Excluir</button></div></div>';
    }).join('');
  }
  function escH(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  document.addEventListener('click', async function(e){
    var t = e.target, o = t.getAttribute && t.getAttribute('data-open'), dj = t.getAttribute && t.getAttribute('data-json'), dl = t.getAttribute && t.getAttribute('data-del');
    var l;
    if (o) { l = lista().filter(function(r){ return r.id === o; })[0]; if (l) { restore(l.data); cur = l.id; $('msg').hidden = true; marca('Aberto: ' + l.title); window.scrollTo({top:0, behavior:'smooth'}); } }
    else if (dj) { l = lista().filter(function(r){ return r.id === dj; })[0]; if (l) await baixarJson(l); }
    else if (dl) {
      if (t.getAttribute('data-sure') !== '1') { t.setAttribute('data-sure', '1'); t.textContent = 'Confirmar exclusão'; setTimeout(function(){ if (t.isConnected) { t.removeAttribute('data-sure'); t.textContent = 'Excluir'; } }, 4000); return; }
      gravaLista(lista().filter(function(r){ return r.id !== dl; })); if (cur === dl) cur = null; desenharLista();
    }
    else if (t.id === 'btn_json' && lastRec) await baixarJson(lastRec);
  });

  $('imp').addEventListener('change', async function(){
    var f = this.files[0]; this.value = '';
    if (!f) return;
    try {
      var j = JSON.parse(await f.text()), rec = j && j.record;
      if (!rec || !rec.data || !rec.data.f) throw new Error('x');
      restore(rec.data); cur = null; $('msg').hidden = true;
      marca('Arquivo aberto: ' + (rec.title || f.name));
      aviso('ok', '<strong>Arquivo aberto.</strong> Confira os dados e use “Salvar rascunho” para guardar neste navegador.');
    } catch (e) { aviso('bad', 'Este arquivo não é uma proposta salva por este formulário.'); }
  });

  $('btn_draft').addEventListener('click', function(){ aposSalvar('rascunho'); });
  $('btn_save').addEventListener('click', function(){
    if (validateAndShow()) aposSalvar('salva');
  });

  /* autosave */
  function agendar(){
    if (restoring) return;
    clearTimeout(timer);
    timer = setTimeout(function(){ wr(AUTO, JSON.stringify({savedAt: Date.now(), data: snapshot()})); }, 1500);
  }
  document.addEventListener('input', agendar);
  document.addEventListener('change', agendar);

  function checarRestauro(){
    var raw = rd(AUTO); if (!raw) return;
    try {
      var a = JSON.parse(raw), s = a.data;
      var vazio = !Object.keys(s.f).some(function(k){ return /^(p|c|v|vc|im)_/.test(k) && s.f[k] && k !== 'p_nac' && k !== 'c_nac' && k !== 'im_sit'; });
      if (vazio) { rm(AUTO); return; }
      var b = $('restore_bar');
      b.innerHTML = '<strong>Há um preenchimento não salvo de ' + quando(a.savedAt) + '</strong> (' + escH(titulo(s)) + '). <div class="rb"><button type="button" class="primary" id="rb_yes">Restaurar</button><button type="button" class="ghost" id="rb_no">Descartar</button></div>';
      b.hidden = false;
      $('rb_yes').addEventListener('click', function(){ restore(s); b.hidden = true; marca('Restaurado'); });
      $('rb_no').addEventListener('click', function(){ rm(AUTO); b.hidden = true; });
    } catch (e) { rm(AUTO); }
  }

  window.AdmStore = {
    snapshot: snapshot, restore: restore, salvar: salvar, lista: lista,
    marcarPdf: function(){ salvar('pdf'); },
    reset: function(){ cur = null; rm(AUTO); marca(''); document.querySelectorAll('.auto').forEach(function(el){ el.classList.remove('auto'); }); }
  };
  desenharLista();
  checarRestauro();
})();
