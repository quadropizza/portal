// Parser do relatório de venda Fast Report (PDF do PDV Quadrô Pizza)
const fs = require('fs');
const raw = fs.readFileSync('rel_abril.txt', 'utf8');

// Match cada bloco "VENDA: NNN ... " até a próxima ocorrência de VENDA: ou fim de arquivo
const blockRe = /VENDA:\s+\d+[\s\S]*?(?=VENDA:\s+\d+|$)/g;
const blocks = raw.match(blockRe) || [];

const sales = [];
const sampleUnparsed = [];
for (const b of blocks) {
  const idM = b.match(/VENDA:\s+(\d+)/);
  // Aceita "DATA DE EMISSÃO" mesmo com encoding quebrado (Ã substituído por �)
  const dtM = b.match(/DATA DE EMISS\S+O:\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!idM || !dtM) { if (sampleUnparsed.length<3) sampleUnparsed.push(b.slice(0,200)); continue; }
  const [_, dd, mm, yyyy, hh, mi, ss] = dtM;
  const dateISO = `${yyyy}-${mm}-${dd}`;
  const hour = parseInt(hh);
  const dow = new Date(`${dateISO}T${hh}:${mi}:${ss}`).getDay();

  // Itens: cada linha do tipo "COD - NOME    ...    QTD    ...    TOTAL"
  const lines = b.split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // pular linhas de pagamento (têm CARTAO/DINHEIRO/PIX/VOUCHER)
    if (/(CARTAO|DINHEIRO|PIX|VOUCHER|TRANSFER|PESSOA|TIPO DE LAN)/i.test(line)) continue;
    const m = line.match(/^\s*(\d+)\s+-\s+([A-Z0-9ÀÁÂÃÄÅÇÉÊËÍÎÏÑÓÔÕÖÚÛÜ \-\/\(\)\.,&'�]+?)\s{2,}(\d+)\s+(?:\d+,\d{2}\s+)?\s*([\d.,]+)\s*$/);
    if (!m) continue;
    const cod = m[1];
    const nome = m[2].trim();
    const qty = parseInt(m[3]);
    const total = parseFloat(m[4].replace(/\./g,'').replace(',', '.'));
    items.push({cod, nome, qty, total});
  }

  const payM = b.match(/^\s*(\d+)\s+-\s+(DINHEIRO|CARTAO DE CREDITO[^\r\n]*|CARTAO DE DEBITO|PIX|VOUCHER|TRANSFER[^\r\n]*)/m);
  const pay = payM ? payM[2].replace(/[�\s]+/g,' ').trim() : 'OUTRO';

  const totalM = b.match(/\(=\)\s*TOTAL\s*VENDA[\s\S]*?R\$\s*([\d.,]+)/);
  const total = totalM ? parseFloat(totalM[1].replace(/\./g,'').replace(',', '.')) : items.reduce((s,i)=>s+(i.total||0),0);

  sales.push({id:idM[1], date:dateISO, hour, dow, total, pay, items});
}

console.log('Blocos encontrados:', blocks.length, '| Vendas parseadas:', sales.length);
if (sampleUnparsed.length) console.log('Amostras não parseadas:', sampleUnparsed.length);

const fmtBR = n => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fat = sales.reduce((s,v)=>s+v.total,0);

console.log('\n== AGREGADOS ABRIL/2026 ==');
console.log('Período:', sales[0]?.date, '→', sales.at(-1)?.date);
console.log('Faturamento bruto:', fmtBR(fat));
console.log('Qtd vendas:', sales.length);
console.log('Ticket médio:', fmtBR(fat/sales.length));

const byDay = {};
for (const s of sales) {
  if (!byDay[s.date]) byDay[s.date] = {qtd:0, fat:0};
  byDay[s.date].qtd++;
  byDay[s.date].fat += s.total;
}
const days = Object.keys(byDay).sort();
console.log('\n== POR DIA (' + days.length + ' dias operados) ==');
for (const d of days) console.log(`  ${d}  qtd=${String(byDay[d].qtd).padStart(3)}  fat=${fmtBR(byDay[d].fat).padStart(13)}  ticket=${fmtBR(byDay[d].fat/byDay[d].qtd)}`);

const dowNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const byDow = Array.from({length:7},()=>({qtd:0,fat:0,dias:new Set()}));
for (const s of sales) { byDow[s.dow].qtd++; byDow[s.dow].fat+=s.total; byDow[s.dow].dias.add(s.date); }
console.log('\n== DIA DA SEMANA ==');
const mediaGeral = fat/days.length;
for (let i=0;i<7;i++) {
  const d = byDow[i]; if (d.qtd===0) continue;
  const media = d.fat/d.dias.size;
  const flag = media < mediaGeral*0.6 ? '⚠️ <60% da média' : media > mediaGeral*1.2 ? '🔥 forte' : '';
  console.log(`  ${dowNames[i]}  ${d.dias.size}d  qtd=${String(d.qtd).padStart(3)}  fat=${fmtBR(d.fat).padStart(13)}  média/dia=${fmtBR(media)} ${flag}`);
}

const byHour = Array.from({length:24},()=>({qtd:0,fat:0}));
for (const s of sales) { byHour[s.hour].qtd++; byHour[s.hour].fat+=s.total; }
console.log('\n== POR HORA ==');
let acumPico = 0;
for (let h=0;h<24;h++) {
  if (byHour[h].qtd===0) continue;
  const pct = (byHour[h].fat/fat*100);
  if (h>=18 && h<=22) acumPico += byHour[h].fat;
  const bar = '█'.repeat(Math.round(pct/2));
  console.log(`  ${String(h).padStart(2,'0')}h  qtd=${String(byHour[h].qtd).padStart(3)}  fat=${fmtBR(byHour[h].fat).padStart(13)}  ${pct.toFixed(1).padStart(4)}%  ${bar}`);
}
console.log(`  → Pico 18h-22h concentra ${(acumPico/fat*100).toFixed(1)}% do faturamento`);

const byPay = {};
for (const s of sales) byPay[s.pay] = (byPay[s.pay]||0) + s.total;
console.log('\n== FORMA DE PAGAMENTO ==');
for (const [p,v] of Object.entries(byPay).sort((a,b)=>b[1]-a[1]))
  console.log(`  ${p.padEnd(35)}  ${fmtBR(v).padStart(13)}  (${(v/fat*100).toFixed(1)}%)`);

const byProd = {};
for (const s of sales) for (const i of s.items) {
  if (!byProd[i.cod]) byProd[i.cod] = {nome:i.nome, qtd:0, fat:0};
  byProd[i.cod].qtd += i.qty;
  byProd[i.cod].fat += i.total;
}
const ranking = Object.entries(byProd).sort((a,b)=>b[1].fat-a[1].fat);
const totItens = ranking.reduce((s,[,p])=>s+p.fat,0);
console.log('\n== RANKING PRODUTOS (TOP 15 / total ' + ranking.length + ') ==');
let acum = 0;
for (const [cod, p] of ranking.slice(0,15)) {
  acum += p.fat;
  console.log(`  ${cod.padEnd(4)} ${p.nome.padEnd(40)} qtd=${String(p.qtd).padStart(4)}  fat=${fmtBR(p.fat).padStart(13)}  (${(p.fat/totItens*100).toFixed(1)}%)`);
}
console.log(`  → Top 3 concentram ${((ranking[0][1].fat+ranking[1][1].fat+ranking[2][1].fat)/totItens*100).toFixed(1)}% das vendas de produto`);

console.log('\n== TODOS OS PRODUTOS ==');
for (const [cod, p] of ranking) console.log(`  ${cod.padEnd(4)} ${p.nome.padEnd(40)} qtd=${String(p.qtd).padStart(4)}`);

fs.writeFileSync('abril_sales.json', JSON.stringify({totals:{fat,vendas:sales.length,dias:days.length}, byDay, byProd}, null, 2));
console.log('\n→ Salvo em abril_sales.json');
