#!/usr/bin/env node
/**
 * update-pesquisas.js
 * ---------------------------------------------------------------
 * Padrão de atualização para os dados de Intenção de Voto do
 * Radar Político BR.
 *
 * Não existe API pública dos institutos (Datafolha, Quaest etc.),
 * então este script NÃO faz scraping automático de nenhum site
 * (isso violaria os termos de uso deles e, mais importante, pode
 * puxar número errado sem verificação humana — inaceitável para
 * dado eleitoral). Em vez disso, ele:
 *
 *   1. Você preenche NOVAS_PESQUISAS abaixo (copiando do texto
 *      oficial do instituto, com a fonte).
 *   2. O script valida o formato (campos obrigatórios, % somando
 *      perto de 100, datas válidas).
 *   3. Adiciona ao topo de pesquisas.json e grava com timestamp.
 *
 * Uso:
 *   node update-pesquisas.js
 *
 * Depois é só publicar o pesquisas.json atualizado no mesmo
 * servidor/pasta do HTML do app.
 * ---------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const ARQUIVO_JSON = path.join(__dirname, 'pesquisas.json');

// ⚠️ EDITE AQUI a cada nova pesquisa divulgada — preencha manualmente
// a partir da fonte oficial/matéria jornalística que traz os números.
const NOVAS_PESQUISAS = [
  // Exemplo de como adicionar uma pesquisa nova (apague ou edite):
  // {
  //   instituto: "Datafolha",
  //   data: "15/09/2026",
  //   amostra: "2.500 entrevistados",
  //   metodologia: "Entrevistas presenciais, margem de erro de 2 p.p.",
  //   fonteUrl: "https://exemplo.com/materia-com-os-numeros",
  //   cenario: "1º turno",
  //   resultados: [
  //     { nome: "Luiz Inácio Lula da Silva", pct: 40 },
  //     { nome: "Flávio Bolsonaro", pct: 30 },
  //     { nome: "Outros / Indecisos", pct: 30 }
  //   ]
  // }
];

function validarPesquisa(p, index) {
  const erros = [];
  const camposObrigatorios = ['instituto', 'data', 'amostra', 'fonteUrl', 'cenario', 'resultados'];
  camposObrigatorios.forEach(campo => {
    if (!p[campo]) erros.push(`Pesquisa #${index}: campo obrigatório ausente: "${campo}"`);
  });

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(p.data || '')) {
    erros.push(`Pesquisa #${index}: campo "data" deve estar no formato DD/MM/AAAA`);
  }

  if (!Array.isArray(p.resultados) || p.resultados.length === 0) {
    erros.push(`Pesquisa #${index}: "resultados" deve ser uma lista não vazia`);
  } else {
    const soma = p.resultados.reduce((acc, r) => acc + (Number(r.pct) || 0), 0);
    if (soma < 95 || soma > 105) {
      erros.push(`Pesquisa #${index}: percentuais somam ${soma}% (esperado ~100%) — confira os números antes de publicar`);
    }
    p.resultados.forEach((r, i) => {
      if (!r.nome || typeof r.pct !== 'number') {
        erros.push(`Pesquisa #${index}, resultado #${i}: precisa de "nome" (texto) e "pct" (número)`);
      }
    });
  }

  try {
    new URL(p.fonteUrl);
  } catch {
    erros.push(`Pesquisa #${index}: "fonteUrl" não é uma URL válida`);
  }

  return erros;
}

function main() {
  if (NOVAS_PESQUISAS.length === 0) {
    console.log('Nenhuma pesquisa nova em NOVAS_PESQUISAS. Edite o script e rode novamente.');
    return;
  }

  let todosErros = [];
  NOVAS_PESQUISAS.forEach((p, i) => {
    todosErros = todosErros.concat(validarPesquisa(p, i));
  });

  if (todosErros.length > 0) {
    console.error('❌ Corrija os erros abaixo antes de publicar:\n');
    todosErros.forEach(e => console.error('  - ' + e));
    process.exit(1);
  }

  const atual = JSON.parse(fs.readFileSync(ARQUIVO_JSON, 'utf8'));
  atual.pesquisas = [...NOVAS_PESQUISAS, ...atual.pesquisas];
  atual.atualizadoEm = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(atual, null, 2), 'utf8');
  console.log(`✅ ${NOVAS_PESQUISAS.length} pesquisa(s) adicionada(s) a pesquisas.json`);
  console.log('Agora publique o arquivo atualizado no servidor/pasta do app.');
}

main();
