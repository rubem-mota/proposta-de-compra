/* ===== UI: formulário, validação e geração ===== */
var $ = function(id){ return document.getElementById(id); };
var UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
var ESTCIVIL = ['Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Separado(a) judicialmente','Viúvo(a)'];
var REGIMES = ['Comunhão parcial de bens','Comunhão universal de bens','Separação total de bens','Participação final nos aquestos','União estável','Segundo comprador (sem vínculo conjugal)'];
var TIPOS = ['Apartamento','Casa','Casa em condomínio','Terreno / lote','Sala / loja comercial','Galpão','Imóvel rural','Outro'];
var SITUACOES = ['Pronto / usado','Na planta / em construção'];

/* campo: {id,label,span,type,opts,req,mask,ph,val,hint} */
function fieldHTML(f){
  var span = f.span || 6, h = '<div class="f s' + span + '" id="w_' + f.id + '"><label for="' + f.id + '">' + f.label + (f.req ? ' <b class="rq" title="obrigatório">*</b>' : '') + '</label>';
  var ph = f.ph ? ' placeholder="' + f.ph + '"' : '';
  var val = f.val !== undefined ? f.val : '';
  if (f.type === 'select') {
    h += '<select id="' + f.id + '">' + (f.noblank ? '' : '<option value="">Selecione</option>') + f.opts.map(function(o){
      var v = typeof o === 'string' ? o : o[0], t = typeof o === 'string' ? o : o[1];
      return '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + t + '</option>';
    }).join('') + '</select>';
  } else if (f.type === 'textarea') {
    h += '<textarea id="' + f.id + '" rows="' + (f.rows || 3) + '"' + ph + '>' + val + '</textarea>';
  } else {
    h += '<input id="' + f.id + '" type="' + (f.type || 'text') + '"' + ph + ' value="' + String(val).replace(/"/g,'&quot;') + '"' + (f.mask === 'money' ? ' inputmode="decimal"' : '') + (f.mask === 'fone' || f.mask === 'cep' || f.mask === 'cpf' ? ' inputmode="numeric"' : '') + ' autocomplete="off">';
  }
  if (f.hint) h += '<small>' + f.hint + '</small>';
  h += '<span class="err" id="e_' + f.id + '"></span></div>';
  return h;
}
function renderFields(target, fields){ $(target).innerHTML = fields.map(fieldHTML).join(''); }

var today = new Date();
var iso = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
var refDefault = 'PC-' + iso.replace(/-/g,'') + '-' + String(today.getHours()).padStart(2,'0') + String(today.getMinutes()).padStart(2,'0');

var F = {};
F.cfg = [
  {id:'cfg_nome', label:'Nome da imobiliária', span:6, val:'Adm House', req:1},
  {id:'cfg_cnpj', label:'CNPJ', span:6, val:'14.904.612/0001-13', req:1, mask:'cnpj'},
  {id:'cfg_resp', label:'Corretora responsável', span:6, val:'Jana Alves da Cruz'},
  {id:'cfg_creci', label:'CRECI', span:6, val:'CRECI/SP 265893-F'},
  {id:'cfg_end', label:'Endereço do escritório', span:12, val:'R. dos Andradas, 263, Centro — Itu/SP — CEP 13.300-170'},
  {id:'cfg_email', label:'E-mail', span:6, val:'janaalvesdacruzjc@gmail.com'},
  {id:'cfg_fone', label:'Telefone', span:6, mask:'fone', ph:'(00) 00000-0000'}
];
F.meta = [
  {id:'m_ref', label:'Nº da proposta', span:4, val:refDefault, req:1},
  {id:'m_local', label:'Local', span:4, val:'Itu/SP', req:1},
  {id:'m_data', label:'Data da proposta', span:4, type:'date', val:iso, req:1}
];
F.p = [
  {id:'p_nome', label:'Nome completo', span:8, req:1},
  {id:'p_estcivil', label:'Estado civil', span:4, type:'select', opts:ESTCIVIL, req:1},
  {id:'p_nac', label:'Nacionalidade', span:4, val:'Brasileiro(a)', req:1},
  {id:'p_nasc', label:'Data de nascimento', span:4, type:'date'},
  {id:'p_nat', label:'Naturalidade', span:4},
  {id:'p_rg', label:'RG / Carteira de identidade', span:4, req:1},
  {id:'p_orgao', label:'Órgão expedidor', span:3, ph:'SSP/SP'},
  {id:'p_cpf', label:'CPF', span:5, mask:'cpf', req:1, ph:'000.000.000-00'},
  {id:'p_prof', label:'Profissão', span:6, req:1},
  {id:'p_trabalho', label:'Local de trabalho', span:6},
  {id:'p_endres', label:'Endereço residencial', span:12, req:1, ph:'Rua, número, complemento, bairro'},
  {id:'p_cidade', label:'Cidade/UF', span:5, req:1},
  {id:'p_cep', label:'CEP', span:3, mask:'cep'},
  {id:'p_fone', label:'Telefone', span:4, mask:'fone', req:1, ph:'(00) 00000-0000'},
  {id:'p_endtrab', label:'Endereço de trabalho', span:8},
  {id:'p_cidtrab', label:'Cidade', span:4},
  {id:'p_email', label:'E-mail', span:12, type:'email'}
];
F.c = [
  {id:'c_nome', label:'Nome completo', span:8, req:1},
  {id:'c_nac', label:'Nacionalidade', span:4, val:'Brasileiro(a)'},
  {id:'c_rg', label:'RG', span:4},
  {id:'c_orgao', label:'Órgão expedidor', span:3},
  {id:'c_cpf', label:'CPF', span:5, mask:'cpf', req:1},
  {id:'c_nasc', label:'Data de nascimento', span:4, type:'date'},
  {id:'c_nat', label:'Naturalidade', span:4},
  {id:'c_prof', label:'Profissão', span:4},
  {id:'c_regime', label:'Regime de bens / vínculo', span:12, type:'select', opts:REGIMES},
  {id:'c_end', label:'Endereço', span:8, ph:'Se o mesmo do proponente, repita'},
  {id:'c_fone', label:'Telefone', span:4, mask:'fone'},
  {id:'c_email', label:'E-mail', span:12, type:'email'}
];
F.v = [
  {id:'v_nome', label:'Nome completo / razão social', span:8, req:1},
  {id:'v_doc', label:'CPF / CNPJ', span:4, mask:'doc', req:1},
  {id:'v_estcivil', label:'Estado civil', span:4, type:'select', opts:ESTCIVIL},
  {id:'v_prof', label:'Profissão', span:8},
  {id:'v_end', label:'Endereço', span:12},
  {id:'v_contato', label:'Telefone / e-mail', span:12}
];
F.vc = [
  {id:'vc_nome', label:'Nome do cônjuge / companheiro(a)', span:8, req:1},
  {id:'vc_doc', label:'CPF', span:4, mask:'cpf', req:1}
];
F.im = [
  {id:'im_tipo', label:'Tipo do imóvel', span:4, type:'select', opts:TIPOS, req:1},
  {id:'im_sit', label:'Situação', span:4, type:'select', opts:SITUACOES, req:1, noblank:1, val:'Pronto / usado'},
  {id:'im_codigo', label:'Código interno', span:4},
  {id:'im_end', label:'Endereço completo', span:12, req:1, ph:'Rua, número, bloco, apartamento, bairro'},
  {id:'im_cidade', label:'Cidade', span:6, req:1},
  {id:'im_uf', label:'UF', span:2, type:'select', opts:UFS, req:1},
  {id:'im_cond', label:'Condomínio / empreendimento', span:4},
  {id:'im_desc', label:'Descrição do imóvel', span:12, type:'textarea', req:1, ph:'Dormitórios, vagas de garagem, áreas, características relevantes'},
  {id:'im_matricula', label:'Matrícula nº e Cartório de Registro de Imóveis', span:8},
  {id:'im_inscr', label:'Inscrição municipal', span:4},
  {id:'im_incluso', label:'Bens e utilidades incluídos na venda', span:12, ph:'Ex.: armários planejados, ar-condicionado'}
];
F.pg = [
  {id:'pg_total', label:'Valor total da proposta (R$)', span:4, mask:'money', req:1, ph:'0,00'},
  {id:'pg_validade', label:'Proposta válida até', span:4, type:'date', req:1},
  {id:'pg_prazoForm', label:'Prazo para formalizar o contrato (dias úteis)', span:4, type:'number', ph:'opcional'},
  {id:'pg_indice', label:'Índice de correção das parcelas', span:6, ph:'Ex.: IPCA, INCC, IGP-M (vazio = sem correção)'},
  {id:'pg_sinalNat', label:'Natureza do sinal', span:6, type:'select', noblank:1, opts:[['principio','Princípio de pagamento (parte do preço)'],['arras','Arras confirmatórias (arts. 417 a 419 do Código Civil)']]}
];
F.fin = [
  {id:'pg_finValor', label:'Valor a financiar (R$)', span:4, mask:'money', req:1},
  {id:'pg_banco', label:'Instituição financeira', span:4, ph:'opcional'},
  {id:'pg_finPrazo', label:'Prazo para protocolar (dias)', span:4, type:'number', ph:'opcional'}
];
F.com = [
  {id:'pg_comissao', label:'Percentual de corretagem devido em caso de desistência (%)', span:6, req:1, ph:'Ex.: 6', hint:'Informe o percentual combinado com a imobiliária.'}
];
F.esp = [
  {id:'pg_especiais', label:'Condições especiais', span:12, type:'textarea', rows:4, ph:'Uma condição por linha. Ex.: entrega do imóvel livre e desocupado na data da escritura.'}
];
F.corr = [
  {id:'co_nome', label:'Corretor(a) responsável', span:7, req:1, val:'Jana Alves da Cruz'},
  {id:'co_creci', label:'CRECI do corretor(a)', span:5, val:'CRECI/SP 265893-F'}
];

renderFields('f_cfg', F.cfg);
renderFields('f_meta', F.meta);
renderFields('f_p', F.p);
renderFields('f_c', F.c);
renderFields('f_v', F.v);
renderFields('f_vc', F.vc);
renderFields('f_im', F.im);
renderFields('f_pg', F.pg);
renderFields('f_fin', F.fin);
renderFields('f_com', F.com);
renderFields('f_esp', F.esp);
renderFields('f_corr', F.corr);
$('pg_comissao').value = '';

/* ---- máscaras ---- */
document.addEventListener('input', function(e){
  var t = e.target, id = t.id || '';
  if (id === 'p_cpf' || id === 'c_cpf' || id === 'vc_doc') t.value = fmtCPF(t.value);
  else if (id === 'v_doc') t.value = fmtDoc(t.value);
  else if (id === 'cfg_cnpj') t.value = fmtCNPJ(t.value);
  else if (/_fone$/.test(id)) t.value = fmtFone(t.value);
  else if (/_cep$/.test(id)) t.value = fmtCEP(t.value);
  else if (t.getAttribute('inputmode') === 'decimal' || t.classList.contains('money')) {
    var dg = t.value.replace(/\D/g,'');
    t.value = dg ? (parseInt(dg,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
  }
  if (t.classList && t.classList.contains('bad')) clearErr(t);
  updateTotals();
});
function clearErr(el){ el.classList.remove('bad'); var e = $('e_' + el.id); if (e) e.textContent = ''; }

/* ---- toggles ---- */
function bindToggle(chk, box){
  var c = $(chk), b = $(box);
  function sync(){ b.hidden = !c.checked; }
  c.addEventListener('change', sync); sync();
}
bindToggle('t_conj', 'box_conj');
bindToggle('t_vconj', 'box_vconj');
bindToggle('t_fin', 'box_fin');
bindToggle('t_com', 'box_com');

/* ---- linhas de pagamento ---- */
var rowSeq = 0;
function addRow(grupo, desc, venc){
  rowSeq++;
  var id = 'r' + rowSeq;
  var div = document.createElement('div');
  div.className = 'prow'; div.id = id;
  div.innerHTML =
    '<div class="f pg"><label for="' + id + '_g">Grupo</label><select id="' + id + '_g"><option value="sinal"' + (grupo === 'sinal' ? ' selected' : '') + '>Sinal / entrada</option><option value="saldo"' + (grupo === 'saldo' ? ' selected' : '') + '>Saldo restante</option></select></div>' +
    '<div class="f pd"><label for="' + id + '_d">Descrição</label><input id="' + id + '_d" type="text" value="' + (desc || '') + '" placeholder="Ex.: sinal via PIX, financiamento, parcelas mensais"></div>' +
    '<div class="f pv"><label for="' + id + '_v">Vencimento</label><input id="' + id + '_v" type="text" value="' + (venc || '') + '" placeholder="dd/mm/aaaa ou na assinatura"></div>' +
    '<div class="f pm"><label for="' + id + '_m">Valor (R$)</label><input id="' + id + '_m" class="money" type="text" inputmode="decimal" placeholder="0,00"></div>' +
    '<button type="button" class="ghost rm" aria-label="Remover linha" data-rm="' + id + '">Remover</button>';
  $('rows').appendChild(div);
}
$('rows').addEventListener('click', function(e){
  var id = e.target.getAttribute && e.target.getAttribute('data-rm');
  if (id) { var el = $(id); if (el) el.remove(); updateTotals(); }
});
$('add_row').addEventListener('click', function(){ addRow('saldo'); });
addRow('sinal', '', 'Na assinatura');
addRow('saldo', '', '');

function getRows(){
  return Array.prototype.slice.call($('rows').children).map(function(r){
    return {grupo: $(r.id + '_g').value, desc: $(r.id + '_d').value.trim(), venc: $(r.id + '_v').value.trim(), valor: parseMoney($(r.id + '_m').value)};
  });
}
function updateTotals(){
  var total = parseMoney($('pg_total').value), rows = getRows();
  var soma = rows.reduce(function(s, r){ return s + r.valor; }, 0);
  var dif = Math.round((total - soma) * 100) / 100;
  var box = $('tot');
  $('tot_total').textContent = 'R$ ' + fmtBRL(total);
  $('tot_soma').textContent = 'R$ ' + fmtBRL(soma);
  $('tot_ext').textContent = total > 0 ? valorExtenso(total) : '';
  if (total > 0 && Math.abs(dif) < 0.005) { box.className = 'tot ok'; $('tot_dif').textContent = 'Confere'; }
  else { box.className = 'tot warn'; $('tot_dif').textContent = (dif > 0 ? 'Faltam R$ ' : 'Excede em R$ ') + fmtBRL(Math.abs(dif)); }
}

/* ---- coleta ---- */
function v(id){ var el = $(id); return el ? el.value.trim() : ''; }
function collect(){
  var d = {
    cfg: {nome:v('cfg_nome'), cnpj:v('cfg_cnpj'), resp:v('cfg_resp'), creci:v('cfg_creci'), end:v('cfg_end'), email:v('cfg_email'), fone:v('cfg_fone')},
    ref: v('m_ref'), local: v('m_local'), data: v('m_data'),
    p: {nome:v('p_nome'), nac:v('p_nac'), estcivil:v('p_estcivil'), nasc:v('p_nasc'), nat:v('p_nat'), rg:v('p_rg'), orgao:v('p_orgao'), cpf:v('p_cpf'), prof:v('p_prof'), trabalho:v('p_trabalho'), endres:v('p_endres'), cidade:v('p_cidade'), cep:v('p_cep'), fone:v('p_fone'), endtrab:v('p_endtrab'), cidtrab:v('p_cidtrab'), email:v('p_email')},
    c: null,
    v: {nome:v('v_nome'), doc:v('v_doc'), estcivil:v('v_estcivil'), prof:v('v_prof'), end:v('v_end'), contato:v('v_contato'), conj:null},
    im: {tipo:v('im_tipo'), sit:v('im_sit'), end:v('im_end'), cidade:v('im_cidade'), uf:v('im_uf'), desc:v('im_desc'), matricula:v('im_matricula'), inscr:v('im_inscr'), cond:v('im_cond'), codigo:v('im_codigo'), incluso:v('im_incluso'), visitou:$('t_visitou').checked},
    pg: {total:parseMoney($('pg_total').value), pagamentos:getRows().filter(function(r){ return r.valor > 0 || r.desc; }), fin:$('t_fin').checked, finValor:parseMoney($('pg_finValor').value), banco:v('pg_banco'), finPrazo:v('pg_finPrazo'), fgts:$('t_fgts').checked, indice:v('pg_indice'), sinalNatureza:v('pg_sinalNat'), validade:v('pg_validade'), prazoForm:v('pg_prazoForm'), comissaoOn:$('t_com').checked, comissao:v('pg_comissao'), especiais:v('pg_especiais')},
    corretor: {nome:v('co_nome'), creci:v('co_creci')}
  };
  if ($('t_conj').checked) d.c = {nome:v('c_nome'), nac:v('c_nac'), rg:v('c_rg'), orgao:v('c_orgao'), nasc:v('c_nasc'), nat:v('c_nat'), cpf:v('c_cpf'), prof:v('c_prof'), regime:v('c_regime'), end:v('c_end'), fone:v('c_fone'), email:v('c_email')};
  if ($('t_vconj').checked) d.v.conj = {nome:v('vc_nome'), doc:v('vc_doc')};
  return d;
}

/* ---- validação ---- */
function validate(d){
  var errs = [];
  function bad(id, msg){ errs.push({id:id, msg:msg}); }
  function req(id, label){ if (!v(id)) bad(id, label + ' é obrigatório.'); }
  [['cfg_nome','Nome da imobiliária'],['cfg_cnpj','CNPJ da imobiliária'],['m_ref','Nº da proposta'],['m_local','Local'],['m_data','Data da proposta'],
   ['p_nome','Nome do proponente'],['p_estcivil','Estado civil do proponente'],['p_nac','Nacionalidade do proponente'],['p_rg','RG do proponente'],['p_prof','Profissão do proponente'],['p_endres','Endereço residencial do proponente'],['p_cidade','Cidade do proponente'],['p_fone','Telefone do proponente'],
   ['v_nome','Nome do vendedor'],['im_tipo','Tipo do imóvel'],['im_end','Endereço do imóvel'],['im_cidade','Cidade do imóvel'],['im_uf','UF do imóvel'],['im_desc','Descrição do imóvel'],
   ['pg_total','Valor total da proposta'],['pg_validade','Validade da proposta'],['co_nome','Corretor(a) responsável']].forEach(function(x){ req(x[0], x[1]); });
  if (v('p_cpf') && !validCPF(v('p_cpf'))) bad('p_cpf', 'CPF do proponente inválido.'); else if (!v('p_cpf')) bad('p_cpf', 'CPF do proponente é obrigatório.');
  if (!v('v_doc')) bad('v_doc', 'CPF/CNPJ do vendedor é obrigatório.');
  else { var dv = onlyDigits(v('v_doc')); if (!(dv.length === 11 ? validCPF(dv) : (dv.length === 14 && validCNPJ(dv)))) bad('v_doc', 'CPF/CNPJ do vendedor inválido.'); }
  if (v('cfg_cnpj') && !validCNPJ(v('cfg_cnpj'))) bad('cfg_cnpj', 'CNPJ da imobiliária inválido.');
  if (d.c) {
    req('c_nome', 'Nome do cônjuge/segundo comprador');
    if (!v('c_cpf')) bad('c_cpf', 'CPF do cônjuge/segundo comprador é obrigatório.'); else if (!validCPF(v('c_cpf'))) bad('c_cpf', 'CPF do cônjuge/segundo comprador inválido.');
  }
  if (d.v.conj) {
    req('vc_nome', 'Nome do cônjuge do vendedor');
    if (!v('vc_doc')) bad('vc_doc', 'CPF do cônjuge do vendedor é obrigatório.'); else if (!validCPF(v('vc_doc'))) bad('vc_doc', 'CPF do cônjuge do vendedor inválido.');
  }
  ['p_email','c_email'].forEach(function(id){ if (v(id) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v(id))) bad(id, 'E-mail inválido.'); });
  if (d.pg.total <= 0 && v('pg_total')) bad('pg_total', 'Informe um valor maior que zero.');
  if (v('pg_validade') && v('m_data') && v('pg_validade') < v('m_data')) bad('pg_validade', 'A validade não pode ser anterior à data da proposta.');
  if (d.pg.fin && !(d.pg.finValor > 0)) bad('pg_finValor', 'Informe o valor a financiar.');
  if (d.pg.comissaoOn) {
    var pc = parseFloat(String(d.pg.comissao).replace(',', '.'));
    if (!(pc > 0 && pc <= 100)) bad('pg_comissao', 'Informe um percentual entre 0 e 100.');
  }
  var rows = d.pg.pagamentos;
  if (!rows.length || !rows.some(function(r){ return r.valor > 0; })) bad('add_row', 'Preencha ao menos uma linha de pagamento com valor.');
  else {
    var soma = rows.reduce(function(s, r){ return s + r.valor; }, 0);
    if (Math.abs(soma - d.pg.total) >= 0.005) bad('add_row', 'A soma das linhas de pagamento (R$ ' + fmtBRL(soma) + ') difere do valor total (R$ ' + fmtBRL(d.pg.total) + ').');
    rows.forEach(function(r, i){ if (r.valor <= 0) bad('add_row', 'A linha de pagamento ' + (i + 1) + ' está sem valor.'); });
  }
  return errs;
}

/* ---- geração ---- */
var lastBlob = null, lastName = '';
function slug(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40); }
function showMsg(kind, html){ var m = $('msg'); m.className = 'msg ' + kind; m.innerHTML = html; m.hidden = false; m.scrollIntoView({block:'center', behavior:'smooth'}); }

async function saveBlob(blob, name){
  var dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({filename: name, data: blob}); return {ok:true}; }
    catch (e) { return {ok:false, reason: (e && e.code) || 'error'}; }
  }
  /* fora do Claude (site publicado): download direto pelo navegador */
  try {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 1500);
    return {ok:true};
  } catch (e) { return {ok:false, reason:'unavailable'}; }
}

function validateAndShow(){
  document.querySelectorAll('.bad').forEach(clearErr);
  var d = collect(), errs = validate(d);
  if (errs.length) {
    errs.forEach(function(x){ var el = $(x.id); if (el && el.classList) { if (x.id !== 'add_row') el.classList.add('bad'); var e = $('e_' + x.id); if (e) e.textContent = x.msg; } });
    showMsg('bad', '<strong>Revise ' + errs.length + (errs.length > 1 ? ' pontos' : ' ponto') + ' antes de continuar:</strong><ul>' + errs.map(function(x){ return '<li><a href="#" data-go="' + x.id + '">' + x.msg + '</a></li>'; }).join('') + '</ul>');
    return null;
  }
  return d;
}
$('btn_gen').addEventListener('click', async function(){
  var d = validateAndShow();
  if (!d) return;
  var J = window.jspdf && window.jspdf.jsPDF;
  if (!J) { showMsg('bad', 'A biblioteca de PDF não carregou. Verifique a conexão e recarregue a página.'); return; }
  try {
    var doc = buildPdf(d, J);
    lastBlob = doc.output('blob');
    lastName = 'Proposta_de_Compra_' + slug(d.p.nome) + '_' + d.data.replace(/-/g,'') + '.pdf';
  } catch (e) { showMsg('bad', 'Não foi possível montar o PDF: ' + (e && e.message ? e.message : e)); return; }
  var r = await saveBlob(lastBlob, lastName);
  var resumo = '<div class="sum"><div><span>Proponente</span>' + d.p.nome + '</div><div><span>Imóvel</span>' + d.im.tipo + ' — ' + d.im.cidade + '/' + d.im.uf + '</div><div><span>Valor</span>R$ ' + fmtBRL(d.pg.total) + '</div><div><span>Válida até</span>' + fmtDate(d.pg.validade) + '</div></div>';
  if (window.AdmStore) { try { AdmStore.marcarPdf(); } catch (e) {} }
  if (r.ok) showMsg('ok', '<strong>PDF gerado.</strong> Arquivo: ' + lastName + '. Envie ao proponente e ao vendedor para assinatura.' + resumo + '<button type="button" class="ghost" id="btn_again">Baixar novamente</button>');
  else if (r.reason === 'declined') showMsg('ok', '<strong>PDF pronto.</strong> Você cancelou o salvamento. Use o botão para baixar quando quiser.' + resumo + '<button type="button" class="ghost" id="btn_again">Baixar PDF</button>');
  else showMsg('bad', 'O PDF foi montado, mas este ambiente não permitiu salvar o arquivo. Abra a página pelo link do artefato no Claude e tente novamente.' + resumo + '<button type="button" class="ghost" id="btn_again">Tentar baixar de novo</button>');
});

document.addEventListener('click', async function(e){
  var go = e.target.getAttribute && e.target.getAttribute('data-go');
  if (go) { e.preventDefault(); var el = $(go); if (el) { el.scrollIntoView({block:'center', behavior:'smooth'}); if (el.focus) el.focus(); } return; }
  if (e.target.id === 'btn_again' && lastBlob) {
    var r = await saveBlob(lastBlob, lastName);
    if (!r.ok && r.reason !== 'declined') showMsg('bad', 'Não foi possível salvar o arquivo neste ambiente.');
  }
});

$('btn_clear').addEventListener('click', function(){
  if (!window.__confirmClear) { window.__confirmClear = true; $('btn_clear').textContent = 'Confirmar limpeza'; setTimeout(function(){ window.__confirmClear = false; $('btn_clear').textContent = 'Limpar formulário'; }, 4000); return; }
  window.__confirmClear = false; $('btn_clear').textContent = 'Limpar formulário';
  var limpar = ['pg_total','pg_validade','pg_prazoForm','pg_indice','pg_finValor','pg_banco','pg_finPrazo','pg_comissao','pg_especiais'];
  document.querySelectorAll('input, textarea, select').forEach(function(el){
    var id = el.id || '';
    if (/^(p|c|v|vc|im)_/.test(id) || limpar.indexOf(id) > -1) el.value = '';
  });
  $('p_nac').value = 'Brasileiro(a)'; $('c_nac').value = 'Brasileiro(a)';
  $('im_sit').value = 'Pronto / usado';
  ['t_conj','t_vconj','t_fin','t_com','t_visitou','t_fgts'].forEach(function(id){ $(id).checked = false; $(id).dispatchEvent(new Event('change')); });
  $('rows').innerHTML = ''; addRow('sinal', '', 'Na assinatura'); addRow('saldo', '', '');
  $('m_ref').value = refDefault; $('msg').hidden = true; updateTotals();
  if (window.AdmStore) AdmStore.reset();
  window.scrollTo({top:0, behavior:'smooth'});
});
updateTotals();
