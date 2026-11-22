/* ===== CORE: utilitários + gerador de PDF (sem dependência de DOM) ===== */
function onlyDigits(s){ return String(s||'').replace(/\D/g,''); }

function validCPF(v){
  var c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (var t = 9; t < 11; t++) {
    var s = 0;
    for (var i = 0; i < t; i++) s += parseInt(c[i],10) * (t + 1 - i);
    var dv = ((s * 10) % 11) % 10;
    if (dv !== parseInt(c[t],10)) return false;
  }
  return true;
}
function validCNPJ(v){
  var c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  function dv(len){
    var pesos = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    var s = 0;
    for (var i = 0; i < len; i++) s += parseInt(c[i],10) * pesos[i];
    var r = s % 11;
    return r < 2 ? 0 : 11 - r;
  }
  return dv(12) === parseInt(c[12],10) && dv(13) === parseInt(c[13],10);
}
function fmtCPF(v){
  var c = onlyDigits(v).slice(0,11);
  return c.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function fmtCNPJ(v){
  var c = onlyDigits(v).slice(0,14);
  return c.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
}
function fmtDoc(v){ var c = onlyDigits(v); return c.length > 11 ? fmtCNPJ(c) : fmtCPF(c); }
function fmtCEP(v){ var c = onlyDigits(v).slice(0,8); return c.length > 5 ? c.slice(0,5) + '-' + c.slice(5) : c; }
function fmtFone(v){
  var c = onlyDigits(v).slice(0,11);
  if (c.length > 10) return c.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');
  if (c.length > 6) return c.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
  if (c.length > 2) return c.replace(/(\d{2})(\d{0,5})/,'($1) $2');
  return c;
}
function fmtBRL(n){
  return (Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function parseMoney(s){
  var t = String(s||'').replace(/\./g,'').replace(',','.').replace(/[^\d.\-]/g,'');
  var n = parseFloat(t);
  return isNaN(n) ? 0 : Math.round(n*100)/100;
}
function fmtDate(iso){
  if (!iso) return '';
  var p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
}
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function dataExtenso(iso){
  if (!iso) return '';
  var p = String(iso).split('-');
  return parseInt(p[2],10) + ' de ' + MESES[parseInt(p[1],10)-1] + ' de ' + p[0];
}

/* ---- valor por extenso (pt-BR) ---- */
var UN = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
var DZ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
var CT = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
function ate999(x){
  if (x === 0) return '';
  if (x === 100) return 'cem';
  var p = [], c = Math.floor(x/100), r = x % 100;
  if (c) p.push(CT[c]);
  if (r) {
    if (r < 20) p.push(UN[r]);
    else { var d = Math.floor(r/10), u = r % 10; p.push(DZ[d] + (u ? ' e ' + UN[u] : '')); }
  }
  return p.join(' e ');
}
function extensoInt(n){
  if (n === 0) return 'zero';
  var escalas = [
    {v:1e9, s:'bilhão', p:'bilhões'},
    {v:1e6, s:'milhão', p:'milhões'},
    {v:1e3, s:'mil', p:'mil'}
  ];
  var partes = [], resto = n;
  escalas.forEach(function(e){
    var q = Math.floor(resto / e.v);
    if (q > 0) {
      resto -= q * e.v;
      if (e.v === 1e3) partes.push({txt: (q === 1 ? '' : ate999(q) + ' ') + 'mil', val: q});
      else partes.push({txt: ate999(q) + ' ' + (q === 1 ? e.s : e.p), val: q});
    }
  });
  if (resto > 0) partes.push({txt: ate999(resto), val: resto});
  var out = '';
  partes.forEach(function(pt, i){
    if (i === 0) { out = pt.txt; return; }
    var ultimo = i === partes.length - 1;
    var liga = (ultimo && (pt.val < 100 || pt.val % 100 === 0)) ? ' e ' : ' ';
    out += liga + pt.txt;
  });
  return out.replace(/\s+/g,' ').trim();
}
function valorExtenso(v){
  v = Math.round((Number(v)||0)*100)/100;
  var reais = Math.floor(v), cent = Math.round((v - reais)*100);
  var partes = [];
  if (reais > 0) {
    var t = extensoInt(reais);
    var de = (reais % 1e6 === 0) ? ' de' : '';
    partes.push(t + de + (reais === 1 ? ' real' : ' reais'));
  }
  if (cent > 0) partes.push(extensoInt(cent) + (cent === 1 ? ' centavo' : ' centavos'));
  return partes.length ? partes.join(' e ') : 'zero real';
}
function romano(n){ return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n] || String(n); }

/* ---- cláusulas (numeração dinâmica, sem referências cruzadas por número fixo) ---- */
function buildClauses(d){
  var C = d.cfg, pg = d.pg, im = d.im;
  var sinalRows = pg.pagamentos.filter(function(r){ return r.grupo === 'sinal' && r.valor > 0; });
  var defs = [];
  function add(key, title, make){ defs.push({key:key, title:title, make:make}); }
  var cidUf = im.cidade + '/' + im.uf;

  add('objeto','DO OBJETO E DAS DEFINIÇÕES', function(n){
    var ps = [];
    ps.push('Pela presente proposta, o PROPONENTE — o comprador qualificado na Seção I e, quando houver, o cônjuge ou segundo comprador qualificado na Seção II, que respondem solidariamente pelas obrigações aqui assumidas — oferece-se para adquirir do VENDEDOR, qualificado nesta proposta, o imóvel descrito na seção própria, pelo preço e nas condições do Quadro de Condições Comerciais, com a intermediação da IMOBILIÁRIA ' + C.nome + ', inscrita no CNPJ sob o nº ' + C.cnpj + '.');
    ps.push(im.visitou
      ? 'O PROPONENTE declara ter visitado e conferido o imóvel, que aceita no estado de conservação em que se encontra, ressalvado o que constar das Condições Especiais.'
      : 'O PROPONENTE formula esta proposta com base nas informações constantes deste instrumento e nas prestadas pela IMOBILIÁRIA, ressalvado o que constar das Condições Especiais.');
    if (im.incluso) ps.push('Incluem-se na negociação os seguintes bens e utilidades: ' + im.incluso + '.');
    return ps;
  });

  add('validade','DA VALIDADE DA PROPOSTA', function(n){
    return [
      'Esta proposta é válida até ' + fmtDate(pg.validade) + '. Durante esse prazo obriga o PROPONENTE, nos termos dos arts. 427 e 428 do Código Civil, não podendo ser retirada nem alterada unilateralmente.',
      'Decorrido o prazo sem a aceitação do VENDEDOR, a proposta perde a eficácia, nada sendo devido pelo PROPONENTE à IMOBILIÁRIA ou ao corretor, e quaisquer valores que tenham sido entregues serão restituídos integralmente, sem retenção ou desconto.',
      'Eventual contraproposta do VENDEDOR somente produzirá efeitos mediante nova aceitação escrita do PROPONENTE.'
    ];
  });

  add('aceite','DA ACEITAÇÃO E DA FORMALIZAÇÃO', function(n){
    var prazo = pg.prazoForm ? 'no prazo de ' + pg.prazoForm + ' (' + extensoInt(parseInt(pg.prazoForm,10)) + ') dias úteis contados da aceitação' : 'no prazo a ser ajustado entre as partes';
    return [
      'Esta proposta somente será considerada aceita após a aprovação expressa do VENDEDOR, manifestada pela assinatura no campo de aceite deste instrumento. Com a aceitação, a negociação torna-se irretratável para ambas as partes, nos termos aqui previstos.',
      'Aceita a proposta, será ela substituída pelo instrumento definitivo da negociação (compromisso de compra e venda, escritura pública ou contrato de financiamento com força de escritura pública, conforme a forma exigida em lei e a modalidade de pagamento), que constituirá o único instrumento legal entre o PROPONENTE e o VENDEDOR e será celebrado ' + prazo + '.'
    ];
  });

  add('preco','DO PREÇO E DA FORMA DE PAGAMENTO', function(n){
    var ps = [
      'O PROPONENTE oferece o preço total de R$ ' + fmtBRL(pg.total) + ' (' + valorExtenso(pg.total) + '), a ser pago na forma do Quadro de Condições Comerciais.',
      pg.indice
        ? 'As parcelas vincendas serão corrigidas mensalmente pelo índice indicado no Quadro de Condições Comerciais (' + pg.indice + ').'
        : 'Não há previsão de correção monetária das parcelas, salvo ajuste diverso no instrumento definitivo.'
    ];
    if (pg.fgts) ps.push('A utilização de recursos do FGTS, indicada nesta proposta, sujeita-se às condições e à aprovação previstas na legislação e nas normas do agente operador, correndo por conta do PROPONENTE a comprovação dos requisitos de elegibilidade.');
    return ps;
  });

  if (sinalRows.length) add('sinal','DO SINAL E DA FORMA DE RECEBIMENTO', function(n){
    var ps = [];
    if (pg.sinalNatureza === 'arras') {
      ps.push('O valor pago a título de sinal constitui arras confirmatórias, nos termos dos arts. 417 a 419 do Código Civil: em caso de execução do contrato, será computado no preço; se a parte que o deu não executar o contrato, a outra poderá tê-lo por desfeito, retendo-o; se a inexecução for de quem o recebeu, a outra poderá haver o contrato por desfeito e exigir a devolução do valor acrescido do equivalente, com atualização monetária, juros e honorários de advogado, ressalvada a possibilidade de indenização suplementar prevista em lei.');
    } else {
      ps.push('O valor pago a título de sinal ou entrada constitui exclusivamente princípio de pagamento do preço, sendo computado como parte dele, sem natureza de arras e sem direito de arrependimento.');
    }
    ps.push('O sinal e os demais valores somente poderão ser pagos por PIX, transferência bancária ou cheque cruzado e nominal, em favor da conta indicada pela IMOBILIÁRIA ou pelo VENDEDOR, mediante recibo. Não serão recebidos valores em espécie, e qualquer outra forma de pagamento dependerá de autorização expressa e escrita da administração da IMOBILIÁRIA.');
    return ps;
  });

  if (pg.fin) add('financiamento','DO FINANCIAMENTO', function(n){
    var prazoFin = pg.finPrazo ? 'no prazo de ' + pg.finPrazo + ' (' + extensoInt(parseInt(pg.finPrazo,10)) + ') dias contados da aceitação desta proposta' : 'com diligência e dentro do prazo compatível com a negociação';
    var valor = pg.finValor > 0 ? 'no valor de R$ ' + fmtBRL(pg.finValor) + ' (' + valorExtenso(pg.finValor) + ')' : 'conforme indicado no Quadro de Condições Comerciais';
    return [
      'Parte do preço, ' + valor + ', será paga com recursos de financiamento imobiliário' + (pg.banco ? ' junto a ' + pg.banco : '') + ', ficando a eficácia da negociação condicionada à aprovação do crédito e à avaliação do imóvel.',
      'O PROPONENTE obriga-se a requerer o financiamento, apresentar a documentação exigida e atender às exigências da instituição financeira que lhe digam respeito ' + prazoFin + '.',
      'Não obtido o financiamento por motivo não imputável ao PROPONENTE — inclusive negativa de crédito fundada em política da instituição financeira, avaliação do imóvel inferior ao preço, ou recusa do imóvel ou da documentação do VENDEDOR —, a negociação ficará desfeita sem multa ou penalidade ao PROPONENTE, restituindo-se os valores por ele pagos, sem retenção ou desconto.',
      'A assinatura desta proposta não vincula a instituição financeira, que somente liberará o crédito efetivamente aprovado e contratado.'
    ];
  });

  add('despesas','DAS DESPESAS E DOS TRIBUTOS', function(n){
    return [
      'Salvo disposição diversa nas Condições Especiais ou no instrumento definitivo, correrão por conta do PROPONENTE o imposto de transmissão (ITBI), os emolumentos, as custas de escritura e de registro e as tarifas do financiamento, quando houver.',
      'Correrão por conta do VENDEDOR os débitos do imóvel anteriores à entrega da posse (IPTU, taxas, condomínio e consumo), as despesas necessárias à regularização de sua titularidade e eventual imposto sobre ganho de capital.'
    ];
  });

  add('documentos','DA DOCUMENTAÇÃO E DA REGULARIDADE DO IMÓVEL', function(n){
    return [
      'A negociação fica condicionada à comprovação, pelo VENDEDOR, de sua titularidade e da regularidade do imóvel, mediante certidão atualizada da matrícula com negativa de ônus e de ações reais e pessoais reipersecutórias, certidões negativas de débitos fiscais e condominiais e certidões dos distribuidores relativas ao VENDEDOR, além dos demais documentos exigidos pela instituição financeira ou pelo Oficial de Registro de Imóveis.',
      'Sendo o VENDEDOR casado ou vivendo em união estável, o cônjuge ou companheiro deverá comparecer ao ato e anuir à venda, nos termos do art. 1.647, inciso I, do Código Civil, salvo no regime de separação absoluta de bens.',
      'O PROPONENTE autoriza a IMOBILIÁRIA a conferir seus dados cadastrais e documentos, bem como os do cônjuge ou segundo comprador, para fins de análise e formalização da negociação.'
    ];
  });

  add('vendedor','DAS DECLARAÇÕES E DO ACEITE DO VENDEDOR', function(n){
    return [
      'Ao assinar o campo de aceite, o VENDEDOR declara ser o legítimo proprietário do imóvel, ter poderes para aliená-lo, estar de acordo com o preço e com as condições desta proposta e que as informações por ele prestadas à IMOBILIÁRIA são verdadeiras.',
      'A remuneração de corretagem devida pelo VENDEDOR é a ajustada com a IMOBILIÁRIA em instrumento próprio, não sendo alterada por esta proposta.'
    ];
  });

  if (pg.comissaoOn) add('corretagem','DA CORRETAGEM EM CASO DE DESISTÊNCIA', function(n){
    var ps = [
      'Caso o PROPONENTE venha a desistir ou a se arrepender da negociação após a aceitação desta proposta pelo VENDEDOR, obriga-se a pagar à IMOBILIÁRIA e ao corretor, em remuneração pelos serviços de intermediação prestados, o equivalente a ' + String(pg.comissao).replace('.', ',') + '% do valor total desta proposta (R$ ' + fmtBRL(pg.total * parseFloat(String(pg.comissao).replace(',', '.')) / 100) + ' sobre o preço ora proposto), nos termos dos arts. 722 e 725 do Código Civil.',
      'Se a proposta não for aceita pelo VENDEDOR, nada será devido pelo PROPONENTE à IMOBILIÁRIA ou ao corretor.'
    ];
    if (pg.fin) ps.push('Não caracteriza desistência a desistência prevista na cláusula do financiamento, decorrente de motivo não imputável ao PROPONENTE.');
    return ps;
  });

  add('declaracoes','DAS DECLARAÇÕES DO PROPONENTE', function(n){
    return [
      'O PROPONENTE declara que as informações e os documentos por ele prestados são verdadeiros, respondendo civil e criminalmente por eles, e que os recursos empregados na negociação têm origem lícita, estando ciente das obrigações de identificação de clientes previstas na legislação de prevenção à lavagem de dinheiro (Lei nº 9.613/1998).',
      'O PROPONENTE reconhece que a IMOBILIÁRIA atua como intermediária da negociação, sem garantir a aprovação de financiamento nem a aceitação desta proposta pelo VENDEDOR, e declara ter lido e concordado com todos os termos deste instrumento.'
    ];
  });

  add('lgpd','DA PROTEÇÃO DE DADOS PESSOAIS', function(n){
    return [
      'Os dados pessoais das partes serão tratados pela IMOBILIÁRIA exclusivamente para análise, negociação e formalização do negócio, cumprimento de obrigações legais e regulatórias e exercício regular de direitos, nos termos da Lei nº 13.709/2018, podendo ser compartilhados, na medida do necessário, com o VENDEDOR, instituições financeiras, cartórios e profissionais envolvidos na operação.' + (C.email ? ' Os titulares poderão exercer seus direitos pelo e-mail ' + C.email + '.' : '')
    ];
  });

  add('assinatura','DAS COMUNICAÇÕES E DA ASSINATURA', function(n){
    return [
      'As comunicações entre as partes serão feitas por escrito, nos endereços e e-mails indicados nesta proposta, cabendo a cada parte informar prontamente a alteração de seus dados.',
      'Esta proposta poderá ser assinada em meio físico ou eletrônico, reconhecendo as partes a validade das assinaturas eletrônicas, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.'
    ];
  });

  if (pg.especiais) add('especiais','DAS CONDIÇÕES ESPECIAIS', function(n){
    var ps = pg.especiais.split(/\n+/).map(function(s){ return s.trim(); }).filter(Boolean);
    ps.push('Em caso de conflito entre as Condições Especiais e as demais cláusulas, prevalecem as Condições Especiais.');
    return ps;
  });

  add('foro','DO FORO', function(n){
    return ['Fica eleito o foro da Comarca de ' + cidUf + ', local da situação do imóvel, para dirimir questões decorrentes desta proposta, ressalvada a competência do foro do domicílio do consumidor quando a relação for de consumo (Lei nº 8.078/1990).'];
  });

  var nums = {};
  defs.forEach(function(x, i){ nums[x.key] = i + 1; });
  return defs.map(function(x, i){
    var ps = x.make(nums);
    return {num: i + 1, title: x.title, paras: ps};
  });
}

/* ---- PDF ---- */
function buildPdf(d, J){
  var doc = new J({unit:'mm', format:'a4', compress:true});
  var W = 210, H = 297, ML = 22, MR = 18, MT = 33, MB = 22, CW = W - ML - MR;
  var NAVY = [27,42,74], GREY = [98,106,122], LINE = [200,205,214], FILL = [239,241,246], INK = [28,30,36];
  var C = d.cfg, y = MT;
  var secN = 0;

  doc.setProperties({title:'Proposta de Compra de Imóvel - ' + d.p.nome, author:C.nome, subject:'Proposta de compra de imóvel', creator:C.nome});

  function setF(style, size, color){
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor.apply(doc, color || INK);
  }
  function wrap(text, w, style, size){ setF(style, size); return doc.splitTextToSize(String(text), w); }
  function need(h){ if (y + h > H - MB) { doc.addPage(); y = MT; } }

  function section(title){
    secN++;
    need(16);
    doc.setFillColor.apply(doc, FILL); doc.rect(ML, y, CW, 6.6, 'F');
    doc.setFillColor.apply(doc, NAVY); doc.rect(ML, y, 1.3, 6.6, 'F');
    setF('bold', 9.2, NAVY);
    doc.text(romano(secN) + ' — ' + title.toUpperCase(), ML + 4, y + 4.5);
    y += 9.6;
  }

  function grid(rows){
    rows.forEach(function(cells){
      var cs = cells.filter(function(c){ return c; });
      var gap = 3, avail = CW - gap * (cs.length - 1), maxL = 1;
      var prep = cs.map(function(c){
        var w = avail * c.w;
        var txt = (c.v !== undefined && c.v !== null && String(c.v).trim()) ? String(c.v) : '—';
        var ls = wrap(txt, w, 'normal', 9.4);
        maxL = Math.max(maxL, ls.length);
        return {c:c, w:w, ls:ls, empty: txt === '—'};
      });
      var h = 6.9 + (maxL - 1) * 4.05 + 2.2;
      need(h);
      var x = ML;
      prep.forEach(function(p){
        setF('normal', 6.6, GREY);
        doc.text(p.c.l.toUpperCase(), x, y + 2.6);
        setF('normal', 9.4, p.empty ? GREY : INK);
        p.ls.forEach(function(t, i){ doc.text(t, x, y + 6.7 + i * 4.05); });
        doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.15);
        doc.line(x, y + h - 0.7, x + p.w, y + h - 0.7);
        x += p.w + gap;
      });
      y += h;
    });
    y += 3.5;
  }

  function para(text, o){
    o = o || {};
    var size = o.size || 9.1, style = o.style || 'normal', indent = o.indent || 0, after = o.after === undefined ? 1.8 : o.after;
    var w = CW - indent, lh = size * 0.3528 * 1.42;
    var ls = wrap(text, w, style, size);
    ls.forEach(function(t, i){
      need(lh + 0.5);
      setF(style, size, o.color);
      var last = i === ls.length - 1;
      if (o.justify !== false && !last && t.indexOf(' ') > -1) doc.text(t, ML + indent, y + 3.2, {align:'justify', maxWidth:w});
      else doc.text(t, ML + indent, y + 3.2);
      y += lh;
    });
    y += after;
  }

  function clauseHeading(n, title){
    need(18);
    setF('bold', 9.2, NAVY);
    doc.text('CLÁUSULA ' + n + 'ª — ' + title, ML, y + 3.2);
    y += 6.2;
  }

  /* -- título -- */
  setF('bold', 16, NAVY);
  doc.text('PROPOSTA DE COMPRA DE IMÓVEL', ML, y + 5);
  y += 9;
  setF('normal', 9, GREY);
  doc.text('Proposta nº ' + d.ref + '  ·  ' + d.local + ', ' + dataExtenso(d.data), ML, y + 3);
  y += 8;
  para('O PROPONENTE abaixo qualificado apresenta, por intermédio da ' + C.nome + ', a presente PROPOSTA DE COMPRA do imóvel descrito neste instrumento, nos termos e condições a seguir.', {after: 4});

  /* -- I proponente -- */
  var p = d.p;
  section('Proponente comprador');
  grid([
    [{l:'Nome completo', v:p.nome, w:.62}, {l:'Estado civil', v:p.estcivil, w:.38}],
    [{l:'Nacionalidade', v:p.nac, w:.3}, {l:'Data de nascimento', v:fmtDate(p.nasc), w:.3}, {l:'Naturalidade', v:p.nat, w:.4}],
    [{l:'Documento de identidade (RG)', v:p.rg, w:.34}, {l:'Órgão expedidor', v:p.orgao, w:.26}, {l:'CPF', v:p.cpf, w:.4}],
    [{l:'Profissão', v:p.prof, w:.4}, {l:'Local de trabalho', v:p.trabalho, w:.6}],
    [{l:'Endereço residencial', v:p.endres, w:1}],
    [{l:'Cidade/UF', v:p.cidade, w:.45}, {l:'CEP', v:p.cep, w:.2}, {l:'Telefone', v:p.fone, w:.35}],
    [{l:'Endereço de trabalho', v:p.endtrab, w:.6}, {l:'Cidade', v:p.cidtrab, w:.4}],
    [{l:'E-mail', v:p.email, w:1}]
  ]);

  /* -- II cônjuge -- */
  if (d.c) {
    var c = d.c;
    section('Cônjuge, companheiro(a) ou segundo comprador');
    grid([
      [{l:'Nome completo', v:c.nome, w:.62}, {l:'Nacionalidade', v:c.nac, w:.38}],
      [{l:'Documento de identidade (RG)', v:c.rg, w:.34}, {l:'Órgão expedidor', v:c.orgao, w:.26}, {l:'CPF', v:c.cpf, w:.4}],
      [{l:'Data de nascimento', v:fmtDate(c.nasc), w:.3}, {l:'Naturalidade', v:c.nat, w:.3}, {l:'Profissão', v:c.prof, w:.4}],
      [{l:'Regime de bens / vínculo', v:c.regime, w:1}],
      [{l:'Endereço', v:c.end, w:.62}, {l:'Telefone', v:c.fone, w:.38}],
      [{l:'E-mail', v:c.email, w:1}]
    ]);
  }

  /* -- III vendedor -- */
  var v = d.v;
  section('Vendedor (proprietário do imóvel)');
  grid([
    [{l:'Nome completo / razão social', v:v.nome, w:.62}, {l:'CPF / CNPJ', v:v.doc, w:.38}],
    [{l:'Estado civil', v:v.estcivil, w:.3}, {l:'Profissão', v:v.prof, w:.7}],
    [{l:'Endereço', v:v.end, w:1}],
    [{l:'Telefone / e-mail', v:v.contato, w:1}]
  ].concat(v.conj ? [[{l:'Cônjuge ou companheiro(a) do vendedor', v:v.conj.nome, w:.62}, {l:'CPF', v:v.conj.doc, w:.38}]] : []));

  /* -- IV imóvel -- */
  var im = d.im;
  section('Imóvel objeto da proposta');
  grid([
    [{l:'Tipo', v:im.tipo, w:.35}, {l:'Situação', v:im.sit, w:.35}, {l:'Código interno', v:im.codigo, w:.3}],
    [{l:'Endereço completo', v:im.end, w:1}],
    [{l:'Cidade', v:im.cidade, w:.5}, {l:'UF', v:im.uf, w:.15}, {l:'Condomínio / empreendimento', v:im.cond, w:.35}],
    [{l:'Descrição', v:im.desc, w:1}],
    [{l:'Matrícula nº / Cartório de Registro de Imóveis', v:im.matricula, w:.6}, {l:'Inscrição municipal', v:im.inscr, w:.4}]
  ]);

  /* -- V quadro comercial -- */
  var pg = d.pg;
  section('Quadro de condições comerciais');
  grid([[{l:'Valor total da proposta', v:'R$ ' + fmtBRL(pg.total) + ' (' + valorExtenso(pg.total) + ')', w:1}]]);

  var cols = [ML, ML + 86, ML + 118], rEnd = ML + CW;
  function tHead(){
    need(14);
    doc.setFillColor.apply(doc, NAVY); doc.rect(ML, y, CW, 6, 'F');
    setF('bold', 8, [255,255,255]);
    doc.text('DESCRIÇÃO', cols[0] + 2, y + 4.1);
    doc.text('VENCIMENTO', cols[1] + 2, y + 4.1);
    doc.text('VALOR (R$)', rEnd - 2, y + 4.1, {align:'right'});
    y += 6;
  }
  function tGroup(label){
    need(14);
    doc.setFillColor.apply(doc, FILL); doc.rect(ML, y, CW, 5.4, 'F');
    setF('bold', 7.8, NAVY); doc.text(label.toUpperCase(), cols[0] + 2, y + 3.8);
    y += 5.4;
  }
  function tRow(r){
    var ls = wrap(r.desc || '—', 82, 'normal', 9);
    var h = Math.max(6, ls.length * 4.1 + 2.2);
    need(h);
    setF('normal', 9);
    ls.forEach(function(t, i){ doc.text(t, cols[0] + 2, y + 4.3 + i * 4.1); });
    doc.text(r.venc || '—', cols[1] + 2, y + 4.3);
    doc.text(fmtBRL(r.valor), rEnd - 2, y + 4.3, {align:'right'});
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.15); doc.line(ML, y + h, rEnd, y + h);
    y += h;
  }
  function tSub(label, val){
    need(7);
    setF('bold', 8.6, INK);
    doc.text(label, rEnd - 40, y + 4.4, {align:'right'});
    doc.text(fmtBRL(val), rEnd - 2, y + 4.4, {align:'right'});
    y += 6.2;
  }
  tHead();
  var gs = pg.pagamentos.filter(function(r){ return r.grupo === 'sinal'; });
  var gr = pg.pagamentos.filter(function(r){ return r.grupo !== 'sinal'; });
  var sum = function(a){ return a.reduce(function(s, r){ return s + r.valor; }, 0); };
  if (gs.length) { tGroup('Sinal / entrada'); gs.forEach(tRow); tSub('Subtotal sinal / entrada', sum(gs)); }
  if (gr.length) { tGroup('Saldo restante'); gr.forEach(tRow); tSub('Subtotal saldo', sum(gr)); }
  need(10);
  doc.setFillColor.apply(doc, FILL); doc.rect(ML, y, CW, 7, 'F');
  setF('bold', 9.2, NAVY);
  doc.text('TOTAL GERAL DO NEGÓCIO', cols[0] + 2, y + 4.8);
  doc.text('R$ ' + fmtBRL(sum(pg.pagamentos)), rEnd - 2, y + 4.8, {align:'right'});
  y += 11;

  var recursos = [];
  if (pg.fin) recursos.push('Financiamento bancário' + (pg.finValor > 0 ? ' (R$ ' + fmtBRL(pg.finValor) + ')' : '') + (pg.banco ? ' — ' + pg.banco : ''));
  if (pg.fgts) recursos.push('FGTS');
  grid([
    [{l:'Recursos envolvidos', v:recursos.join('; ') || 'Recursos próprios', w:.6}, {l:'Índice de correção das parcelas', v:pg.indice || 'Sem correção', w:.4}],
    [{l:'Natureza do sinal', v:pg.sinalNatureza === 'arras' ? 'Arras confirmatórias (arts. 417 a 419 do Código Civil)' : 'Princípio de pagamento do preço', w:.6}, {l:'Proposta válida até', v:fmtDate(pg.validade), w:.4}]
  ]);

  /* -- VI condições gerais -- */
  section('Condições gerais');
  buildClauses(d).forEach(function(cl){
    clauseHeading(cl.num, cl.title);
    cl.paras.forEach(function(t, i){
      var pre = cl.paras.length > 1 ? cl.num + '.' + (i + 1) + '  ' : '';
      para(pre + t, {after: 1.6});
    });
    y += 1.6;
  });

  /* -- VII assinaturas -- */
  need(24);
  y += 2;
  section('Assinaturas');
  para('E, por estarem de acordo, firmam esta proposta em ' + d.local + ', em ' + dataExtenso(d.data) + ', em duas vias de igual teor ou em formato eletrônico.', {after: 4});

  function sigPair(a, b){
    var gap = 10, w = (CW - gap) / 2;
    var blocks = [a, b].filter(function(x){ return x; });
    var hs = blocks.map(function(bl){
      var h = 12;
      bl.lines.forEach(function(t){ h += wrap(t, w, 'normal', 8).length * 3.6; });
      return h + wrap(bl.name, w, 'bold', 9).length * 4;
    });
    var H2 = Math.max.apply(null, hs);
    need(H2 + 4);
    blocks.forEach(function(bl, i){
      var x = ML + i * (w + gap), top = y + 12;
      doc.setDrawColor.apply(doc, INK); doc.setLineWidth(0.25); doc.line(x, top, x + w, top);
      setF('bold', 7, NAVY); doc.text(bl.role.toUpperCase(), x, y + 3);
      var yy = top + 4;
      setF('bold', 9); wrap(bl.name, w, 'bold', 9).forEach(function(t){ doc.text(t, x, yy); yy += 4; });
      setF('normal', 8, GREY);
      bl.lines.forEach(function(t){ wrap(t, w, 'normal', 8).forEach(function(tt){ doc.text(tt, x, yy); yy += 3.6; }); });
    });
    y += H2 + 5;
  }

  sigPair(
    {role:'Proponente comprador', name:p.nome, lines:['CPF ' + p.cpf]},
    d.c ? {role:'Cônjuge / segundo comprador', name:d.c.nome, lines:['CPF ' + d.c.cpf]} : null
  );

  need(30);
  var boxTop = y;
  setF('bold', 8.6, NAVY);
  doc.text('ACEITE DO VENDEDOR', ML, y + 3.4);
  y += 6;
  para('O VENDEDOR, qualificado nesta proposta, declara ter ciência de seu teor, aceita-a integralmente nos termos e condições acima, tornando-a irretratável, e confirma as declarações a ele atribuídas, em ____ / ____ / ________.', {after: 3});
  sigPair(
    {role:'Vendedor (proprietário)', name:v.nome, lines:[(v.doc ? 'CPF/CNPJ ' + v.doc : '')].filter(Boolean)},
    v.conj ? {role:'Cônjuge / companheiro(a) do vendedor (anuência)', name:v.conj.nome, lines:['CPF ' + v.conj.doc]} : null
  );

  sigPair(
    {role:'Corretor(a) responsável pela intermediação', name:d.corretor.nome, lines:[d.corretor.creci, C.nome + ' — CNPJ ' + C.cnpj].filter(Boolean)},
    null
  );

  /* -- cabeçalho e rodapé em todas as páginas -- */
  var total = doc.getNumberOfPages();
  for (var i = 1; i <= total; i++) {
    doc.setPage(i);
    setF('bold', 13, NAVY); doc.text(C.nome, ML, 13);
    setF('bold', 8.2, NAVY); doc.text('PROPOSTA DE COMPRA', W - MR, 12, {align:'right'});
    setF('normal', 7.6, GREY); doc.text('Nº ' + d.ref, W - MR, 16, {align:'right'});
    var l2 = 'CNPJ ' + C.cnpj + (C.resp ? '  ·  Resp.: ' + C.resp + (C.creci ? ' — ' + C.creci : '') : '');
    doc.text(l2, ML, 17.6);
    var l3 = [C.end, C.email, C.fone].filter(Boolean).join('  ·  ');
    doc.text(doc.splitTextToSize(l3, CW - 30)[0], ML, 21.4);
    doc.setDrawColor.apply(doc, NAVY); doc.setLineWidth(0.5); doc.line(ML, 25, W - MR, 25);
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.2); doc.line(ML, H - 16, W - MR, H - 16);
    setF('normal', 7.4, GREY);
    doc.text(doc.splitTextToSize('Proposta de Compra nº ' + d.ref + '  ·  Proponente: ' + d.p.nome, CW - 30)[0], ML, H - 11.8);
    doc.text('Página ' + i + ' de ' + total, W - MR, H - 11.8, {align:'right'});
  }
  return doc;
}

if (typeof module !== 'undefined') module.exports = {buildPdf:buildPdf, valorExtenso:valorExtenso, validCPF:validCPF, validCNPJ:validCNPJ, buildClauses:buildClauses, fmtDoc:fmtDoc, parseMoney:parseMoney, fmtBRL:fmtBRL};
