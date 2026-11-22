/* ===== EXTRAÇÃO: transforma o texto lido de documentos em campos do formulário (sem DOM) ===== */
function exNorm(s){
  return String(s || '').split('').map(function(ch){ return ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }).join('').toUpperCase();
}
function exPrep(text){
  var lines = String(text || '').split(/\r?\n/).map(function(s){ return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  return {lines: lines, nl: lines.map(exNorm), all: exNorm(text)};
}
function exTitle(s){
  var small = {DE:1, DA:1, DO:1, DAS:1, DOS:1, E:1};
  return String(s || '').toLowerCase().split(/\s+/).map(function(w, i){
    return (i > 0 && small[w.toUpperCase()]) ? w : w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}
function exCleanName(s){ return String(s || '').replace(/[^A-Za-zÀ-ÿ' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function exCutName(s){ return String(s||'').split(/[,;:]|\bCPF\b|\bRG\b|\bCNPJ\b|\bINSCRIT/i)[0]; }
function exPlausibleName(s){
  var c = exCleanName(s), w = c.split(' ').filter(function(x){ return x.length > 1; });
  return c.length >= 8 && c.length <= 70 && w.length >= 2;
}
function exParseDate(s){
  var m = /(\d{2})\s*[\/\.\-\s]\s*(\d{2})\s*[\/\.\-\s]\s*(\d{4})/.exec(String(s || ''));
  if (!m) return null;
  var d = +m[1], mo = +m[2], y = +m[3];
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return null;
  return m[3] + '-' + m[2] + '-' + m[1];
}
function exIsLabel(n){
  return /^(NOME|FILIACAO|NATURALIDADE|DATA|DOC|CPF|REGISTRO|VALIDADE|ASSINATURA|CATEGORIA|OBSERVACOES|LOCAL|ORGAO|PAI|MAE|NACIONALIDADE|ENDERECO|BAIRRO|CEP|CIDADE)\b/.test(n) || /:\s*$/.test(n);
}
/* valor depois de um rótulo: na mesma linha ou nas 2 seguintes */
function exFindValue(P, labelRe, exclRe, validator){
  for (var i = 0; i < P.lines.length; i++) {
    var m = labelRe.exec(P.nl[i]);
    if (!m) continue;
    if (exclRe && exclRe.test(P.nl[i])) continue;
    var rest = P.lines[i].slice(m.index + m[0].length).replace(/^[\s:\-\.\/]+/, '');
    if (rest && validator(rest)) return rest;
    for (var j = i + 1; j <= i + 2 && j < P.lines.length; j++) {
      if (exIsLabel(P.nl[j]) && !validator(P.lines[j])) continue;
      if (validator(P.lines[j])) return P.lines[j];
    }
  }
  return null;
}
function exFirstValidCPF(text){
  var re = /(?<!\d)(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?!\d)/g, m;
  while ((m = re.exec(String(text || '')))) { if (validCPF(m[1])) return onlyDigits(m[1]); }
  return null;
}
function exEarliestDate(text){
  var re = /(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/g, m, best = null, now = new Date().getFullYear();
  while ((m = re.exec(String(text || '')))) {
    var iso = exParseDate(m[0]);
    if (!iso) continue;
    var y = +m[3];
    if (y > now - 14) continue;
    if (!best || iso < best) best = iso;
  }
  return best;
}
function exCityUf(s){
  var m = /^(.*?)[\s\-\/,]+([A-Za-z]{2})\s*$/.exec(String(s || '').replace(/[^A-Za-zÀ-ÿ\s\-\/,]/g, ' ').replace(/\s+/g, ' ').trim());
  if (m && m[1].length > 2) return exTitle(m[1].trim()) + '/' + m[2].toUpperCase();
  return null;
}

/* ---- classificação do documento ---- */
function exClassify(text){
  var t = exNorm(text), tipos = [];
  if (/REGISTRO GERAL|CARTEIRA DE IDENTIDADE|SECRETARIA DE SEGURANCA|INSTITUTO DE IDENTIFICACAO|CARTEIRA DE IDENTIDADE NACIONAL/.test(t)) tipos.push('rg');
  if (/CARTEIRA NACIONAL DE HABILITACAO|PERMISSAO PARA DIRIGIR|\bCNH\b/.test(t)) tipos.push('cnh');
  if (/CERTIDAO DE CASAMENTO/.test(t)) tipos.push('casamento');
  if (/CERTIDAO DE NASCIMENTO/.test(t)) tipos.push('nascimento');
  if (/MATRICULA|REGISTRO DE IMOVEIS|ESCRITURA PUBLICA|INTEIRO TEOR|OFICIAL DE REGISTRO/.test(t) && /IMOVEL|IMOVEIS|ESCRITURA|REGISTRO/.test(t)) tipos.push('matricula');
  if (/\bIPTU\b|IMPOSTO PREDIAL|INSCRICAO (IMOBILIARIA|CADASTRAL)/.test(t)) tipos.push('iptu');
  if (/ENERGIA ELETRICA|UNIDADE CONSUMIDORA|AGUA E ESGOTO|SANEAMENTO|FATURA|CONTA DE (LUZ|AGUA)|CONSUMO|VENCIMENTO/.test(t)) tipos.push('conta');
  return tipos;
}
var EX_NOMES = {rg:'RG', cnh:'CNH', casamento:'Certidão de casamento', nascimento:'Certidão de nascimento', matricula:'Escritura / matrícula', iptu:'IPTU', conta:'Comprovante de endereço (conta)', outro:'Documento não identificado'};

/* ---- documento pessoal (RG, CNH) e certidões ---- */
function exParsePessoal(text){
  var P = exPrep(text), out = {};
  var cpf = exFirstValidCPF(text);
  if (cpf) out.cpf = fmtCPF(cpf);

  var nome = exFindValue(P, /\bNOME( E SOBRENOME)?\b/, /\b(PAI|MAE|SOCIAL|FILIACAO|CONJUGE|EMPRESA|ASSINATURA|PAIS)\b/, exPlausibleName);
  if (nome) out.nome = exCleanName(exCutName(nome)).toUpperCase();

  var nasc = exFindValue(P, /NASC(IMENTO)?\b/, null, function(s){ return !!exParseDate(s); });
  var nascIso = nasc ? exParseDate(nasc) : exEarliestDate(text);
  if (nascIso) out.nasc = nascIso;

  var nat = exFindValue(P, /NATURALIDADE/, null, function(s){ return !!exCityUf(s); });
  if (nat) out.nat = exCityUf(nat);

  var cpfDig = cpf || '';
  var rgRe = /(?<![\d.])(\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]|\d{7,9})(?!\d)/;
  var orgRe = /\b(SSP|SESP|SJS|SDS|PC|DETRAN|IFP|IGP|SPTC|DIC|IIRGD|POLITEC|SEJUSP|DGPC)\b[\s\/\-]*([A-Z]{2})?\b/;
  for (var i = 0; i < P.lines.length && !out.rg; i++) {
    if (!/(REGISTRO GERAL|\bRG\b|DOC(UMENTO)?\.? ?(DE )?IDENTIDADE|IDENTIDADE\/ORG)/.test(P.nl[i])) continue;
    for (var j = i; j <= i + 2 && j < P.lines.length; j++) {
      var seg = j === i ? P.lines[j].replace(/^.*?(REGISTRO GERAL|RG|IDENTIDADE)[^\d]*/i, '') : P.lines[j];
      var m = rgRe.exec(seg);
      if (!m) continue;
      var dg = onlyDigits(m[1]);
      if (cpfDig && cpfDig.indexOf(dg) > -1) continue;
      if (exParseDate(seg) && onlyDigits(exParseDate(seg)) === dg) continue;
      out.rg = m[1];
      var o = orgRe.exec(exNorm(P.lines[j]));
      if (o) out.orgao = o[1] + (o[2] ? '/' + o[2] : '');
      break;
    }
  }
  if (!out.orgao) { var o2 = orgRe.exec(P.all); if (o2 && o2[2]) out.orgao = o2[1] + '/' + o2[2]; }

  if (/CERTIDAO DE CASAMENTO/.test(P.all)) {
    out.estcivil = 'Casado(a)';
    if (/COMUNHAO PARCIAL/.test(P.all)) out.regime = 'Comunhão parcial de bens';
    else if (/COMUNHAO UNIVERSAL/.test(P.all)) out.regime = 'Comunhão universal de bens';
    else if (/SEPARACAO (TOTAL|DE BENS|CONVENCIONAL|OBRIGATORIA)/.test(P.all)) out.regime = 'Separação total de bens';
    else if (/PARTICIPACAO FINAL/.test(P.all)) out.regime = 'Participação final nos aquestos';
  }
  return out;
}

/* ---- endereço (conta de luz, água, telefone, IPTU) ---- */
var EX_STREET = /^(RUA|R\.|AV\.?|AVENIDA|ALAMEDA|AL\.|TRAVESSA|TV\.|ESTRADA|ROD\.|RODOVIA|PRACA|PCA|QUADRA|QD\.?|LARGO|VIELA|BECO|CONJUNTO|SITIO|CHACARA)\s+\S/;
function exParseEndereco(text){
  var P = exPrep(text), out = {};
  var cepRe = /(?<!\d)(\d{5})-?(\d{3})(?!\d)/;
  var best = null;
  for (var i = 0; i < P.lines.length; i++) {
    var n = P.nl[i].replace(/^(ENDERECO|END\.?|LOGRADOURO|ENDERECO DE ENTREGA)[:\s]+/, '');
    if (!EX_STREET.test(n)) continue;
    var cepIdx = -1;
    for (var j = Math.max(0, i - 3); j <= Math.min(P.lines.length - 1, i + 4); j++) { if (cepRe.test(P.nl[j])) { cepIdx = j; break; } }
    var cand = {i: i, cepIdx: cepIdx, line: P.lines[i].replace(/^(endere[cç]o|end\.?|logradouro)[:\s]+/i, '')};
    if (cepIdx > -1) { best = cand; break; }
    if (!best) best = cand;
  }
  if (best) {
    out.street = best.line.replace(/\s+-?\s*CEP.*$/i, '').trim().slice(0, 120);
    var blk = P.lines.slice(Math.max(0, best.i - 1), best.i + 5).join('\n');
    var b = /BAIRRO[:\s]+([A-Za-zÀ-ÿ0-9 \.]{3,40})/i.exec(blk);
    if (b) out.bairro = exTitle(b[1].replace(/\s+(CEP|CIDADE|MUNICIPIO).*$/i, '').trim());
    if (best.cepIdx > -1) {
      var cl = P.lines[best.cepIdx], cm = cepRe.exec(P.nl[best.cepIdx]);
      out.cep = cm[1] + '-' + cm[2];
      var after = cl.slice(cm.index + cm[0].length), before = cl.slice(0, cm.index);
      var c1 = exCityUf(after.replace(/^[\s,\-–]+/, '')) || exCityUf(before.replace(/CEP[:\s]*$/i, '').replace(/[,\-–\s]+$/, '').replace(/^.*[,\-–]\s*/, ''));
      if (c1) { var pr = c1.split('/'); out.cidade = pr[0]; out.uf = pr[1]; }
    }
  }
  if (!out.cep) { var cm2 = cepRe.exec(P.all); if (cm2) out.cep = cm2[1] + '-' + cm2[2]; }
  if (!out.cidade) {
    var cid = exFindValue(P, /(CIDADE|MUNICIPIO)[:\s]*/, null, function(s){ return /[A-Za-zÀ-ÿ]{3}/.test(s); });
    if (cid) { var cu = exCityUf(cid); if (cu) { out.cidade = cu.split('/')[0]; out.uf = cu.split('/')[1]; } else out.cidade = exTitle(exCleanName(cid)); }
  }
  var tit = exFindValue(P, /\b(NOME|CLIENTE|TITULAR|CONSUMIDOR|CONTRIBUINTE)\b[:\s]*/, /\b(PAI|MAE|BANCO)\b/, exPlausibleName);
  if (tit) out.titular = exCleanName(exCutName(tit)).toUpperCase();
  return out;
}

/* ---- imóvel (escritura, matrícula, IPTU) ---- */
function exParseImovel(text, tipos){
  var P = exPrep(text), out = {};
  tipos = tipos || exClassify(text);
  var eMat = tipos.indexOf('matricula') > -1;
  if (eMat) {
    var mm = /MATRICULA\s*(?:N[O°º\.]*\s*)?[:\-]?\s*(\d[\d\.]{2,11}\d)/.exec(P.all);
    if (mm) out.matricula = mm[1];
    var cartorio = null;
    for (var i = 0; i < P.lines.length; i++) {
      if (/REGISTRO DE IMOVEIS|OFICIAL DE REGISTRO/.test(P.nl[i]) && P.lines[i].length < 110) { cartorio = P.lines[i]; break; }
    }
    if (cartorio) out.cartorio = exTitle(cartorio.replace(/^[\s\.\-:]+/, '').trim()).replace(/([\s\-\/])([A-Za-z]{2})$/, function(m, a, b){ return a + b.toUpperCase(); });
  }
  var ins = /(INSCRICAO\s*(MUNICIPAL|CADASTRAL|IMOBILIARIA)?|CADASTRO MUNICIPAL)[^\dA-Z]{0,14}(\d[\d\.\-\/]{5,24}\d)/.exec(P.all);
  if (ins) out.inscr = ins[3];

  var areas = [], re = /AREA\s*(PRIVATIVA|UTIL|TOTAL|CONSTRUIDA|DO TERRENO|COMUM)?[^\d]{0,25}(\d+[\.,]\d+)\s*M/g, am;
  while ((am = re.exec(P.all)) && areas.length < 3) {
    var rot = am[1] ? exTitle(am[1]) : 'Área', val = am[2].replace('.', ',');
    var txt = (am[1] ? 'Área ' + rot.toLowerCase() : 'Área') + ' de ' + val + ' m²';
    if (areas.indexOf(txt) < 0) areas.push(txt);
  }
  if (areas.length) out.area = areas.join('; ');

  if (/APARTAMENTO/.test(P.all)) out.tipo = 'Apartamento';
  else if (/LOTE|TERRENO/.test(P.all)) out.tipo = 'Terreno / lote';
  else if (/SALA COMERCIAL|LOJA/.test(P.all)) out.tipo = 'Sala / loja comercial';
  else if (/GALPAO/.test(P.all)) out.tipo = 'Galpão';
  else if (/\bCASA\b/.test(P.all)) out.tipo = 'Casa';

  var cond = /(?:CONDOMINIO|EDIFICIO|EDIF\.)\s+((?:RESIDENCIAL\s+)?[A-Z0-9][A-Z0-9 ]{3,45}?)(?=\s*(?:,|-|\.|SITUAD|LOCALIZAD|NA RUA|NO |\n|$))/.exec(P.all);
  if (cond) out.cond = exTitle(cond[1].trim());

  var sit = /(?:SITUAD[OA]|LOCALIZAD[OA])\s+(?:A|NA|NO|EM)?\s*((?:RUA|AV\.?|AVENIDA|ALAMEDA|TRAVESSA|ESTRADA|RODOVIA)\s+[A-Z0-9 \.]{3,60}?)\s*,\s*(?:N[O°º]?\.?\s*)?(\d+)/.exec(P.all);
  var sitBairro = /BAIRRO\s+([A-Z][A-Z \.]{2,40}?)\s*(?:,|\.|CEP|$)/.exec(P.all);
  var sitCid = /,\s*([A-Z][A-Z ]{2,30}?)\s*\/\s*([A-Z]{2})\b/.exec(P.all.slice(sit ? P.all.indexOf(sit[0]) : 0));
  var end = exParseEndereco(text);
  if (sit) {
    out.street = exTitle(sit[1].trim()) + ', nº ' + sit[2];
    if (sitBairro) out.bairro = exTitle(sitBairro[1].trim());
    if (sitCid) { out.cidade = exTitle(sitCid[1].trim()); out.uf = sitCid[2]; }
  } else if (end.street) out.street = end.street;
  if (!out.bairro && end.bairro) out.bairro = end.bairro;
  if (!out.cidade && end.cidade) { out.cidade = end.cidade; out.uf = end.uf; }
  if (end.cep) out.cep = end.cep;

  var prop = exFindValue(P, /(PROPRIETARI[OA]S?|OUTORGANTE VENDEDOR[A]?|VENDEDOR[A]?|CONTRIBUINTE)[:\s]*/, null, exPlausibleName);
  if (prop) {
    out.proprietario = exCleanName(exCutName(prop)).toUpperCase();
    var pi = P.lines.findIndex(function(l){ return l.indexOf(prop) > -1; });
    var near = P.lines.slice(Math.max(0, pi - 1), pi + 4).join(' ');
    var pc = exFirstValidCPF(near);
    if (pc) out.cpfProp = fmtCPF(pc);
  }
  return out;
}

/* ---- orquestra: decide o que extrair conforme a seção ---- */
function exExtract(text, alvo){
  var tipos = exClassify(text), res = {tipos: tipos, campos: {}, avisos: []};
  var temPessoal = tipos.some(function(t){ return t === 'rg' || t === 'cnh' || t === 'casamento' || t === 'nascimento'; });
  if (alvo === 'im') {
    if (tipos.indexOf('matricula') > -1 || tipos.indexOf('iptu') > -1 || tipos.indexOf('conta') > -1) res.campos.imovel = exParseImovel(text, tipos);
    if (tipos.indexOf('conta') > -1 && !res.campos.imovel) res.campos.imovel = exParseImovel(text, tipos);
  } else {
    if (temPessoal) res.campos.pessoal = exParsePessoal(text);
    if (tipos.indexOf('conta') > -1 || tipos.indexOf('iptu') > -1) res.campos.endereco = exParseEndereco(text);
    if (!temPessoal && tipos.length === 0) {
      var pp = exParsePessoal(text);
      if (pp.cpf || pp.nome) res.campos.pessoal = pp;
    }
  }
  return res;
}

if (typeof module !== 'undefined') module.exports = {exClassify:exClassify, exParsePessoal:exParsePessoal, exParseEndereco:exParseEndereco, exParseImovel:exParseImovel, exExtract:exExtract, exNorm:exNorm};
