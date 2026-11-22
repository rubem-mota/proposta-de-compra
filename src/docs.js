/* ===== DOCUMENTOS: modo manual/automático, upload, leitura (PDF/OCR) e preenchimento ===== */
(function(){
  var LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    ocr: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
  };
  var loaded = {}, worker = null, workerP = null, chain = Promise.resolve();

  function loadScript(src){
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function(res, rej){
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function(){ delete loaded[src]; rej(new Error('Não foi possível carregar o leitor de documentos. Verifique a conexão.')); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- modo ---------- */
  function setMode(m){
    document.body.setAttribute('data-mode', m);
    $('mode_auto').setAttribute('aria-pressed', m === 'auto');
    $('mode_manual').setAttribute('aria-pressed', m === 'manual');
    lsSet('adm_mode', m);
  }
  $('mode_auto').addEventListener('click', function(){ setMode('auto'); });
  $('mode_manual').addEventListener('click', function(){ setMode('manual'); });
  setMode(lsGet('adm_mode') === 'manual' ? 'manual' : 'auto');

  /* ---------- preenchimento ---------- */
  function fieldLabel(id){ var l = document.querySelector('label[for="' + id + '"]'); return l ? l.textContent.replace(/\s*\*\s*$/, '') : id; }
  function setAuto(id, val){
    var el = $(id);
    if (!el || !val) return false;
    if (el.value && !el.classList.contains('auto')) return false;
    if (el.tagName === 'SELECT') {
      var ok = false;
      Array.prototype.forEach.call(el.options, function(o){ if (o.value === val || o.text === val) { el.value = o.value; ok = true; } });
      if (!ok) return false;
    } else el.value = val;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.classList.add('auto');
    el.title = 'Preenchido automaticamente — confira com o documento';
    return true;
  }
  document.addEventListener('input', function(e){ if (e.isTrusted && e.target.classList) e.target.classList.remove('auto'); });
  document.addEventListener('change', function(e){ if (e.isTrusted && e.target.classList) e.target.classList.remove('auto'); });

  function linhaEndereco(a){
    var p = [a.street];
    if (a.bairro) p.push(a.bairro);
    if (a.cidade) p.push(a.cidade + (a.uf ? '/' + a.uf : ''));
    if (a.cep) p.push('CEP ' + a.cep);
    return p.filter(Boolean).join(', ');
  }
  var MAPA = {
    p: {nome:'p_nome', rg:'p_rg', orgao:'p_orgao', cpf:'p_cpf', nasc:'p_nasc', nat:'p_nat', estcivil:'p_estcivil'},
    c: {nome:'c_nome', rg:'c_rg', orgao:'c_orgao', cpf:'c_cpf', nasc:'c_nasc', nat:'c_nat', regime:'c_regime'},
    v: {nome:'v_nome', cpf:'v_doc', estcivil:'v_estcivil'}
  };
  var ROT = {nome:'Nome', cpf:'CPF', rg:'RG', nasc:'Nascimento', street:'Endereço', cep:'CEP', cidade:'Cidade', matricula:'Matrícula', area:'Área'};
  var ESPERADO = {rg:['nome','cpf','rg','nasc'], cnh:['nome','cpf','rg','nasc'], conta:['street','cep','cidade'], matricula:['matricula','street','area']};

  function aplicar(alvo, res){
    var feitos = [], avisos = [];
    function put(id, val){ if (setAuto(id, val)) feitos.push(fieldLabel(id)); }
    var c = res.campos;
    if (alvo !== 'im') {
      var mp = MAPA[alvo];
      if (c.pessoal) {
        Object.keys(c.pessoal).forEach(function(k){ if (mp[k]) put(mp[k], c.pessoal[k]); });
      }
      if (c.endereco && c.endereco.street) {
        var a = c.endereco;
        if (alvo === 'p') { put('p_endres', a.street + (a.bairro ? ', ' + a.bairro : '')); put('p_cidade', a.cidade ? a.cidade + (a.uf ? '/' + a.uf : '') : ''); put('p_cep', a.cep); }
        else if (alvo === 'c') put('c_end', linhaEndereco(a));
        else put('v_end', linhaEndereco(a));
        var campoNome = $(alvo === 'v' ? 'v_nome' : alvo + '_nome');
        if (a.titular && campoNome && campoNome.value && exNorm(campoNome.value).split(' ')[0] !== exNorm(a.titular).split(' ')[0])
          avisos.push('O comprovante está em nome de ' + exTitle(a.titular) + '. Confira se o endereço é de quem está sendo qualificado.');
      }
    } else if (c.imovel) {
      var im = c.imovel;
      put('im_tipo', im.tipo);
      put('im_end', im.street ? im.street + (im.bairro ? ', ' + im.bairro : '') : '');
      put('im_cidade', im.cidade); put('im_uf', im.uf);
      put('im_cond', im.cond);
      put('im_desc', im.area);
      put('im_matricula', im.matricula ? 'Matrícula nº ' + im.matricula + (im.cartorio ? ' — ' + im.cartorio : '') : '');
      put('im_inscr', im.inscr);
      if (im.proprietario) {
        put('v_nome', im.proprietario);
        if (im.cpfProp) put('v_doc', im.cpfProp);
      }
    }
    var perdidos = [];
    res.tipos.forEach(function(t){
      (ESPERADO[t] || []).forEach(function(k){
        var obj = c.pessoal || c.endereco || c.imovel || {};
        if (!obj[k] && perdidos.indexOf(ROT[k]) < 0) perdidos.push(ROT[k]);
      });
    });
    return {feitos: feitos, perdidos: perdidos, avisos: avisos};
  }

  /* ---------- leitura (PDF e imagem) ---------- */
  async function getWorker(onStatus){
    if (worker) return worker;
    if (!workerP) workerP = (async function(){
      await loadScript(LIBS.ocr);
      var w = await window.Tesseract.createWorker('por', 1, {logger: function(m){
        if (m && m.status && onStatus) onStatus(m.status === 'recognizing text' ? 'Lendo texto… ' + Math.round((m.progress || 0) * 100) + '%' : 'Preparando leitor…');
      }});
      worker = w; return w;
    })();
    try { return await workerP; } catch (e) { workerP = null; throw e; }
  }
  function toCanvas(img, maxDim){
    var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, s = Math.min(1, maxDim / Math.max(w, h));
    var cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cv.width, cv.height);
    try {
      var id = cx.getImageData(0, 0, cv.width, cv.height), d = id.data;
      for (var i = 0; i < d.length; i += 4) { var g = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114) | 0; d[i] = d[i+1] = d[i+2] = g; }
      cx.putImageData(id, 0, 0);
    } catch (e) {}
    return cv;
  }
  function loadImage(file){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function(){ URL.revokeObjectURL(url); res(im); };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('Imagem inválida ou formato não suportado.')); };
      im.src = url;
    });
  }
  async function ocr(canvas, onStatus){
    var w = await getWorker(onStatus);
    var r = await w.recognize(canvas);
    return (r && r.data && r.data.text) || '';
  }
  async function lerArquivo(file, onStatus){
    var isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      onStatus('Abrindo imagem…');
      var im = await loadImage(file);
      return ocr(toCanvas(im, 2400), onStatus);
    }
    onStatus('Abrindo PDF…');
    await loadScript(LIBS.pdf);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    var pdf = await window.pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
    var n = Math.min(pdf.numPages, 6), texto = '';
    for (var i = 1; i <= n; i++) {
      var page = await pdf.getPage(i), tc = await page.getTextContent(), linhas = {}, ys = [];
      tc.items.forEach(function(it){
        var y = Math.round(it.transform[5] / 3);
        if (!linhas[y]) { linhas[y] = []; ys.push(y); }
        linhas[y].push({x: it.transform[4], s: it.str});
      });
      ys.sort(function(a, b){ return b - a; });
      texto += ys.map(function(y){ return linhas[y].sort(function(a, b){ return a.x - b.x; }).map(function(o){ return o.s; }).join(' '); }).join('\n') + '\n';
    }
    if (texto.replace(/\s/g, '').length >= 40) return texto;
    var ocrTxt = '';
    for (var j = 1; j <= n; j++) {
      onStatus('PDF digitalizado: lendo página ' + j + ' de ' + n + '…');
      var pg = await pdf.getPage(j), vp = pg.getViewport({scale: 2}), cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise;
      ocrTxt += (await ocr(cv, onStatus)) + '\n';
    }
    return ocrTxt;
  }

  /* ---------- painéis de upload ---------- */
  var PAINEIS = {
    p: {id:'dz_p', t:'Documentos do comprador', d:'RG ou CNH, comprovante de endereço (conta de luz, água, telefone), certidão de casamento.'},
    c: {id:'dz_c', t:'Documentos do cônjuge / segundo comprador', d:'RG ou CNH, comprovante de endereço, certidão de casamento.'},
    v: {id:'dz_v', t:'Documentos do vendedor (proprietário)', d:'RG ou CNH, comprovante de endereço, certidão de casamento.'},
    im: {id:'dz_im', t:'Documentos do imóvel', d:'Escritura, matrícula, IPTU ou conta de luz/água do imóvel. Se o proprietário constar, preenche também o vendedor.'}
  };
  var estado = {};
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  Object.keys(PAINEIS).forEach(function(alvo){
    var P = PAINEIS[alvo], root = $(P.id);
    if (!root) return;
    estado[alvo] = [];
    root.className = 'docs';
    root.innerHTML =
      '<div class="docs-h"><strong>Preencher a partir de documentos</strong><span>' + esc(P.d) + '</span></div>' +
      '<label class="drop" id="drop_' + alvo + '" for="in_' + alvo + '">Toque para escolher fotos ou PDFs, ou arraste os arquivos aqui</label>' +
      '<input type="file" id="in_' + alvo + '" multiple accept="image/*,application/pdf" hidden aria-label="' + esc(P.t) + '">' +
      '<ul class="dlist" id="dl_' + alvo + '" aria-live="polite"></ul>' +
      '<div class="docs-f"><small>A leitura é feita neste aparelho. Os arquivos não são enviados nem guardados. Fotos nítidas, com o documento inteiro e bem iluminado, dão melhor resultado. Campos preenchidos ficam marcados em azul: confira cada um.</small>' +
      '<button type="button" class="ghost" id="re_' + alvo + '" hidden>Reaplicar dados lidos</button></div>';
    var inp = $('in_' + alvo), drop = $('drop_' + alvo);
    inp.addEventListener('change', function(){ enfileirar(alvo, Array.prototype.slice.call(inp.files)); inp.value = ''; });
    ['dragover', 'dragenter'].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function(e){ enfileirar(alvo, Array.prototype.slice.call(e.dataTransfer.files)); });
    $('re_' + alvo).addEventListener('click', function(){
      estado[alvo].forEach(function(it){ if (it.res) { it.out = aplicar(alvo, it.res); desenhar(alvo); } });
    });
  });

  function desenhar(alvo){
    var ul = $('dl_' + alvo);
    ul.innerHTML = estado[alvo].map(function(it){
      var corpo;
      if (it.erro) corpo = '<span class="st bad">' + esc(it.erro) + '</span>';
      else if (!it.res) corpo = '<span class="st">' + esc(it.status || 'Na fila…') + '</span>';
      else {
        var tipo = it.res.tipos.length ? it.res.tipos.map(function(t){ return EX_NOMES[t]; }).join(' + ') : EX_NOMES.outro;
        var o = it.out || {feitos: [], perdidos: [], avisos: []};
        corpo = '<span class="st ok">' + esc(tipo) + '</span>' +
          (o.feitos.length ? '<span class="det">Preenchido: ' + esc(o.feitos.join(', ')) + '</span>' : '<span class="det">Nenhum campo novo preenchido (campos já preenchidos manualmente são preservados).</span>') +
          (o.perdidos.length ? '<span class="det warnt">Não localizado: ' + esc(o.perdidos.join(', ')) + '. Preencha manualmente.</span>' : '') +
          o.avisos.map(function(a){ return '<span class="det warnt">' + esc(a) + '</span>'; }).join('');
      }
      return '<li><b>' + esc(it.nome) + '</b>' + corpo + '</li>';
    }).join('');
    $('re_' + alvo).hidden = !estado[alvo].some(function(it){ return it.res; });
  }

  function enfileirar(alvo, arquivos){
    arquivos.forEach(function(f){
      var it = {nome: f.name, status: 'Na fila…'};
      estado[alvo].push(it);
      chain = chain.then(async function(){
        try {
          it.status = 'Iniciando…'; desenhar(alvo);
          var txt = await lerArquivo(f, function(s){ it.status = s; desenhar(alvo); });
          it.res = exExtract(txt, alvo);
          it.out = aplicar(alvo, it.res);
          it.texto = txt.length;
          if (!it.res.tipos.length && !Object.keys(it.res.campos).length) it.erro = 'Não consegui identificar o tipo deste documento. Tente uma foto mais nítida ou preencha manualmente.';
        } catch (e) { it.erro = (e && e.message) ? e.message : 'Falha ao ler o arquivo.'; }
        desenhar(alvo);
      });
    });
    desenhar(alvo);
  }

  window.AdmDocs = {setAuto: setAuto, aplicar: aplicar, enfileirar: enfileirar, _lerArquivo: lerArquivo};
})();
