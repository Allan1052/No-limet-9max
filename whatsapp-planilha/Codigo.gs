/**
 * ============================================================================
 *  ROBÔ WHATSAPP  ->  CONTROLE FINANCEIRO (Google Sheets)
 *  Autor: gerado para Allan
 * ----------------------------------------------------------------------------
 *  O que este script faz:
 *   - Recebe mensagens do seu WhatsApp (via API oficial do Meta / WhatsApp Cloud)
 *   - Interpreta o texto e cria o lançamento na planilha automaticamente
 *   - Responde no WhatsApp confirmando
 *
 *  Dois tipos de mensagem entendidos:
 *   1) FINANCEIRO  ->  cria linha na aba LANÇAMENTO
 *        "saída 50 mercado"      "gastei 120,90 farmácia"   "-50 uber"
 *        "entrada 3000 salário"  "recebi 200 freela"        "+200 freela"
 *   2) HORA EXTRA  ->  registra na lista de hora extra e soma no salário
 *        "hora extra 2h 60%"     "he 2 horas 60"            "extra 1,5h 100%"
 *
 *  Comandos úteis:
 *   "saldo"   -> responde o saldo do mês atual
 *   "ajuda"   -> mostra os formatos aceitos
 *
 *  >>> LEIA O GUIA-PASSO-A-PASSO.md ANTES DE USAR. <<<
 * ============================================================================
 */

// ===== CONFIGURAÇÃO (preenchida pelo GUIA; NÃO deixe tokens públicos) ========
// Estes valores ficam guardados de forma segura em "Propriedades do Script".
// Use a função configurarCredenciais() UMA vez para gravá-los (veja o guia).
function _cfg() {
  var p = PropertiesService.getScriptProperties();
  return {
    VERIFY_TOKEN:     p.getProperty('VERIFY_TOKEN')     || 'muda_este_token',
    WHATSAPP_TOKEN:   p.getProperty('WHATSAPP_TOKEN')   || '',   // token de acesso do Meta
    PHONE_NUMBER_ID:  p.getProperty('PHONE_NUMBER_ID')  || '',   // ID do número no Meta
    NUMERO_AUTORIZADO: p.getProperty('NUMERO_AUTORIZADO') || ''  // só este número pode escrever (ex: 5511999998888)
  };
}

// Nomes EXATOS das abas (como vieram do seu Excel — atenção ao espaço em "DÍVIDAS ")
var ABA_LANCAMENTO = 'LANÇAMENTO';
var ABA_FINANCAS   = 'FINANÇAS';
var ABA_SALARIO    = 'SALÁRIO';
var ABA_HE         = 'HORA EXTRA';
var ABA_HE_WPP      = 'HORA EXTRA (WHATSAPP)';   // criada automaticamente na configuração

var MESES_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

// ============================================================================
//  1) VERIFICAÇÃO DO WEBHOOK (o Meta chama isto uma vez, com GET)
// ============================================================================
function doGet(e) {
  var cfg = _cfg();
  var p = (e && e.parameter) ? e.parameter : {};
  if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === cfg.VERIFY_TOKEN) {
    return ContentService.createTextOutput(p['hub.challenge'] || '');
  }
  return ContentService.createTextOutput('Erro de verificação');
}

// ============================================================================
//  2) RECEBIMENTO DE MENSAGENS (o Meta chama isto com POST a cada mensagem)
// ============================================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var value = body.entry && body.entry[0].changes && body.entry[0].changes[0].value;
    if (!value || !value.messages || !value.messages.length) {
      return _ok(); // pode ser um "status" (entregue/lido), ignora
    }
    var msg   = value.messages[0];
    var from  = msg.from;                          // número de quem enviou
    var texto = (msg.text && msg.text.body) ? msg.text.body : '';

    var cfg = _cfg();
    // Segurança: só o número autorizado pode alterar a planilha
    if (cfg.NUMERO_AUTORIZADO && from !== cfg.NUMERO_AUTORIZADO) {
      enviarWhatsApp(from, '⛔ Número não autorizado a lançar nesta planilha.');
      return _ok();
    }

    var resposta = processarMensagem(texto);
    enviarWhatsApp(from, resposta);
    return _ok();
  } catch (err) {
    return _ok(); // nunca devolve erro pro Meta (evita reenvios em loop)
  }
}

function _ok() { return ContentService.createTextOutput('EVENT_RECEIVED'); }

// ============================================================================
//  3) INTERPRETADOR — decide o que a mensagem quer dizer
// ============================================================================
function processarMensagem(textoOriginal) {
  var texto = (textoOriginal || '').trim();
  var t = _semAcento(texto.toLowerCase());

  if (!t) return 'Recebi uma mensagem vazia. Digite "ajuda" para ver os formatos.';
  if (t === 'ajuda' || t === 'help' || t === 'menu') return textoAjuda();
  if (t === 'saldo') return respostaSaldo();

  // ---- HORA EXTRA ----  ex: "hora extra 2h 60%", "he 2 horas 60", "extra 1,5h 100"
  if (/^(he|hora extra|extra)\b/.test(t)) {
    return lancarHoraExtra(texto);
  }

  // ---- FINANCEIRO ----
  return lancarFinanceiro(texto);
}

// ============================================================================
//  4) LANÇAMENTO FINANCEIRO -> aba LANÇAMENTO
// ============================================================================
function lancarFinanceiro(texto) {
  var t = _semAcento(texto.toLowerCase());
  var tipo = null;

  // Detecta ENTRADA x SAÍDA por palavra-chave ou pelos atalhos + / -
  var ENTRADA = /(^\+|\bentrada\b|\brecebi\b|\brecebimento\b|\bganhei\b|\bsalario\b|\bdeposito\b)/;
  var SAIDA   = /(^\-|\bsaida\b|\bgastei\b|\bpaguei\b|\bpagamento\b|\bgasto\b|\bcompra\b|\bcomprei\b|\bdespesa\b)/;

  if (ENTRADA.test(t))      tipo = 'ENTRADA';
  else if (SAIDA.test(t))   tipo = 'SAÍDA';

  // Primeiro número da mensagem = valor (aceita 1.234,56 / 1234.56 / 50)
  var valor = _primeiroValor(texto);
  if (valor === null) {
    return '❓ Não achei o valor. Ex: "saída 50 mercado" ou "entrada 3000 salário".';
  }

  // Se não deu pra saber o tipo, assume SAÍDA (a maioria dos lançamentos é gasto)
  if (!tipo) tipo = 'SAÍDA';

  // Descrição = o texto sem as palavras de comando, valor e sinais
  var desc = _extrairDescricao(texto, valor);
  if (!desc) desc = (tipo === 'ENTRADA' ? 'ENTRADA' : 'DESPESA');

  var hoje = new Date();
  var linha = _proximaLinhaLancamento();
  var sh = _sheet(ABA_LANCAMENTO);
  sh.getRange(linha, 2).setValue(hoje);                                 // B DATA
  sh.getRange(linha, 3).setValue(MESES_PT[hoje.getMonth()]);            // C MÊS (pt, à prova de idioma)
  sh.getRange(linha, 4).setValue(tipo);                                 // D TIPO
  sh.getRange(linha, 5).setValue(desc.toUpperCase());                   // E DESCRIÇÃO
  sh.getRange(linha, 6).setValue(valor);                                // F VALOR
  // G PAGO fica em branco (você marca quando quitar)

  SpreadsheetApp.flush();
  var saldo = saldoDoMes(MESES_PT[hoje.getMonth()]);
  return '✅ Lançado: ' + tipo + ' ' + _brl(valor) + ' — ' + desc.toUpperCase() +
         ' (' + _dataCurta(hoje) + ').\nSaldo de ' + MESES_PT[hoje.getMonth()] + ': ' + _brl(saldo) + '.';
}

// ============================================================================
//  5) HORA EXTRA -> lista dedicada + soma no salário
// ============================================================================
function lancarHoraExtra(texto) {
  var nums = _todosNumeros(texto); // ex: "he 2h 60%" -> [2, 60]
  if (nums.length < 1) {
    return '❓ Ex: "hora extra 2h 60%". Informe as horas e o % (60, 75 ou 100).';
  }
  var horas = nums[0];
  var pct;
  if (nums.length >= 2) {
    pct = nums[1];
  } else {
    // Sem % informado: usa o padrão pelo dia da semana (dia útil 60, sáb 75, dom 100)
    var d = new Date().getDay(); // 0=dom, 6=sáb
    pct = (d === 0) ? 100 : (d === 6) ? 75 : 60;
  }
  if (pct > 1 && pct <= 100) pct = pct / 100;      // 60 -> 0,60
  if (pct > 100) pct = pct / 100;                  // segurança

  var valorHora = _valorHora();
  var valor = horas * (valorHora * (1 + pct));      // ex: 2 * (36,10 * 1,60) = 115,52

  var sh = _sheetHeWpp();
  var linha = Math.max(sh.getLastRow() + 1, 4);
  var hoje = new Date();
  sh.getRange(linha, 1).setValue(hoje);             // A DATA
  sh.getRange(linha, 2).setValue(horas);            // B HORAS
  sh.getRange(linha, 3).setValue(pct);              // C % (fração)
  sh.getRange(linha, 4).setValue(valor);            // D VALOR

  SpreadsheetApp.flush();
  var totalMes = sh.getRange('G3').getValue();      // total do ciclo atual (fórmula)
  return '✅ Hora extra: ' + _numHoras(horas) + ' a ' + Math.round(pct*100) + '% = ' + _brl(valor) +
         '.\nTotal de hora extra do ciclo: ' + _brl(totalMes) + '.';
}

// ============================================================================
//  6) SALDO / AJUDA
// ============================================================================
function respostaSaldo() {
  var m = MESES_PT[new Date().getMonth()];
  return '💰 Saldo de ' + m + ': ' + _brl(saldoDoMes(m)) + '.';
}

function saldoDoMes(mesPT) {
  var sh = _sheet(ABA_FINANCAS);
  var dados = sh.getRange(4, 2, 12, 4).getValues(); // B4:E15 = MÊS, ENTRADA, SAÍDA, SALDO
  for (var i = 0; i < dados.length; i++) {
    if (String(dados[i][0]).toUpperCase() === mesPT) return Number(dados[i][3]) || 0;
  }
  return 0;
}

function textoAjuda() {
  return '📒 *Como lançar pelo WhatsApp:*\n\n' +
         '*Gastos/entradas:*\n' +
         '• saída 50 mercado\n' +
         '• gastei 120,90 farmácia\n' +
         '• entrada 3000 salário\n' +
         '• -50 uber   (atalho de saída)\n' +
         '• +200 freela (atalho de entrada)\n\n' +
         '*Hora extra:*\n' +
         '• hora extra 2h 60%\n' +
         '• he 1,5h 100\n\n' +
         '*Outros:*\n' +
         '• saldo  → mostra o saldo do mês\n' +
         '• ajuda  → mostra esta lista';
}

// ============================================================================
//  7) ENVIO DE RESPOSTA NO WHATSAPP (Graph API do Meta)
// ============================================================================
function enviarWhatsApp(para, texto) {
  var cfg = _cfg();
  if (!cfg.WHATSAPP_TOKEN || !cfg.PHONE_NUMBER_ID) return; // ainda não configurado
  var url = 'https://graph.facebook.com/v20.0/' + cfg.PHONE_NUMBER_ID + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    to: para,
    type: 'text',
    text: { body: texto }
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + cfg.WHATSAPP_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ============================================================================
//  8) HELPERS DE PLANILHA
// ============================================================================
function _ss()   { return SpreadsheetApp.getActiveSpreadsheet(); }
function _sheet(nome) {
  var sh = _ss().getSheetByName(nome);
  if (!sh) throw new Error('Aba não encontrada: ' + nome);
  return sh;
}

function _proximaLinhaLancamento() {
  var sh = _sheet(ABA_LANCAMENTO);
  var col = sh.getRange(4, 2, Math.max(sh.getMaxRows() - 3, 1), 1).getValues(); // coluna B a partir da linha 4
  for (var i = 0; i < col.length; i++) {
    if (col[i][0] === '' || col[i][0] === null) return 4 + i;
  }
  return 4 + col.length;
}

// Cria (se preciso) a lista de hora extra do WhatsApp e devolve a aba
function _sheetHeWpp() {
  var ss = _ss();
  var sh = ss.getSheetByName(ABA_HE_WPP);
  if (!sh) {
    sh = ss.insertSheet(ABA_HE_WPP);
    sh.getRange('A1').setValue('LANÇAMENTOS DE HORA EXTRA VIA WHATSAPP');
    sh.getRange('A3:D3').setValues([['DATA', 'HORAS', '%', 'VALOR (R$)']]);
    // Ciclo de hora extra (20 -> 19 do mês seguinte), calculado com TODAY()
    sh.getRange('F1').setValue('Início do ciclo:');
    sh.getRange('G1').setFormula('=IF(DAY(TODAY())>=20, DATE(YEAR(TODAY()),MONTH(TODAY()),20), EDATE(DATE(YEAR(TODAY()),MONTH(TODAY()),20),-1))');
    sh.getRange('F2').setValue('Fim do ciclo:');
    sh.getRange('G2').setFormula('=EDATE(G1,1)-1');
    sh.getRange('F3').setValue('Total do ciclo atual:');
    sh.getRange('G3').setFormula('=SUMIFS(D:D, A:A, ">="&G1, A:A, "<="&G2)');
    sh.getRange('A1').setFontWeight('bold');
    sh.getRange('A3:D3').setFontWeight('bold');
    sh.getRange('G1:G3').setNumberFormat('dd/mm/yyyy');
    sh.getRange('G3').setNumberFormat('"R$ "#,##0.00');
    sh.setColumnWidth(1, 100);
  }
  return sh;
}

// Valor da hora = SALÁRIO!C4
function _valorHora() {
  var v = Number(_sheet(ABA_SALARIO).getRange('C4').getValue());
  return isNaN(v) || v <= 0 ? 0 : v;
}

// ============================================================================
//  9) HELPERS DE TEXTO / NÚMERO
// ============================================================================
function _semAcento(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Converte "1.234,56" ou "1234.56" ou "50" em número
function _paraNumero(str) {
  if (str == null) return null;
  var s = String(str).replace(/[^\d.,-]/g, '');
  if (!s) return null;
  if (s.indexOf(',') > -1) {           // formato BR: vírgula é decimal
    s = s.replace(/\./g, '').replace(',', '.');
  }
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Primeiro número "de dinheiro" da mensagem (ignora "2h" isolado etc. não; pega o 1º)
function _primeiroValor(texto) {
  var m = texto.match(/-?\d[\d.]*,?\d*/);
  return m ? Math.abs(_paraNumero(m[0])) : null;
}

// Todos os números da mensagem (para hora extra: horas e %)
function _todosNumeros(texto) {
  var out = [];
  var re = /\d[\d.]*,?\d*/g, m;
  while ((m = re.exec(texto)) !== null) {
    var n = _paraNumero(m[0]);
    if (n !== null) out.push(n);
  }
  return out;
}

// Remove palavras de comando, o valor e sinais -> sobra a descrição
function _extrairDescricao(texto, valor) {
  var s = ' ' + texto + ' ';
  // remove os números (com sinal +/- e milhares/decimais) que possam aparecer
  s = s.replace(/[+\-]?\d[\d.]*,?\d*/g, ' ');
  var stop = ['entrada','saida','saída','gastei','paguei','pagamento','gasto','recebi','recebimento',
              'ganhei','deposito','depósito','compra','comprei','despesa','de','no','na','do','da','em','r$','rs',
              '+','-'];
  var palavras = s.split(/\s+/).filter(function (w) {
    if (!w) return false;
    var wl = _semAcento(w.toLowerCase());
    return stop.indexOf(wl) === -1 && stop.indexOf(w.toLowerCase()) === -1;
  });
  return palavras.join(' ').trim();
}

function _brl(n) {
  n = Number(n) || 0;
  var s = Math.abs(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-R$ ' : 'R$ ') + s;
}
function _dataCurta(d) {
  return ('0' + d.getDate()).slice(-2) + '/' + MESES_PT[d.getMonth()].toLowerCase();
}
function _numHoras(h) {
  return (Number.isInteger(h) ? h : String(h).replace('.', ',')) + 'h';
}

// ============================================================================
//  10) CONFIGURAÇÃO (rode UMA vez pelo editor — veja o guia)
// ============================================================================

/**
 * Grava suas credenciais de forma segura. Preencha os valores abaixo,
 * rode esta função UMA vez, e depois APAGUE os valores daqui (ficam salvos).
 */
function configurarCredenciais() {
  var props = {
    VERIFY_TOKEN:      'crie_uma_senha_qualquer_aqui', // você inventa; usa a mesma no painel do Meta
    WHATSAPP_TOKEN:    'COLE_AQUI_O_TOKEN_DO_META',
    PHONE_NUMBER_ID:   'COLE_AQUI_O_PHONE_NUMBER_ID',
    NUMERO_AUTORIZADO: 'SEU_NUMERO_COM_DDI'            // ex: 5511999998888 (só ele pode lançar)
  };
  PropertiesService.getScriptProperties().setProperties(props);
  Logger.log('Credenciais salvas com segurança. Pode apagar os valores da função.');
}

/**
 * Prepara a planilha para a hora extra e liga o total ao salário.
 * Rode UMA vez depois de importar a planilha no Google Sheets.
 */
function configurarPlanilha() {
  _sheetHeWpp(); // cria a aba de hora extra do WhatsApp com as fórmulas

  // Liga SALÁRIO!C7 para incluir a hora extra lançada pelo WhatsApp,
  // SEM quebrar a grade diária existente ('HORA EXTRA'!F48).
  var c7 = _sheet(ABA_SALARIO).getRange('C7');
  var atual = c7.getFormula();
  var refWpp = "'" + ABA_HE_WPP + "'!G3";
  if (atual.indexOf(ABA_HE_WPP) === -1) {
    var base = atual ? atual.replace(/^=/, '') : "'" + ABA_HE + "'!F48";
    c7.setFormula('=' + base + ' + ' + refWpp);
  }
  SpreadsheetApp.flush();
  Logger.log('Planilha configurada. SALÁRIO!C7 agora = ' + c7.getFormula());
}

/**
 * Testes rápidos no editor (não precisa do WhatsApp para testar a lógica).
 */
function _teste() {
  Logger.log(processarMensagem('saída 50 mercado'));
  Logger.log(processarMensagem('entrada 3000 salário'));
  Logger.log(processarMensagem('gastei 120,90 farmácia'));
  Logger.log(processarMensagem('hora extra 2h 60%'));
  Logger.log(processarMensagem('saldo'));
}
