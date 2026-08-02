# Respira 💚

Um aplicativo de auto-ajuda para as pessoas perceberem **cedo** como está a sua saúde mental,
de forma acolhedora, privada e sem julgamento — e serem conectadas a **ajuda real** quando precisam.

> **Importante:** este app **não é diagnóstico** e **não substitui** um profissional de saúde.
> Ele é uma ponte para o autoconhecimento e para buscar apoio.

## O que ele faz (primeira versão)

- **Avaliar meu humor** — questionário **PHQ-9** (rastreio de sintomas de depressão).
- **Avaliar minha ansiedade** — questionário **GAD-7** (rastreio de sintomas de ansiedade).
- **Detecção de risco** — se a pessoa sinaliza pensamentos de se ferir, o app mostra
  na hora os canais de crise (CVV 188).
- **Respirar por 1 minuto** — exercício guiado de respiração para acalmar.
- **Onde buscar ajuda** — CVV 188, SAMU 192, CAPS/SUS.
- **Meu histórico** — acompanha a evolução ao longo do tempo.
- **Botão de crise sempre visível** no topo da tela.

## Privacidade

Tudo roda **no aparelho da pessoa**. Nenhum dado é enviado para servidores —
o histórico fica guardado apenas no navegador do próprio usuário (`localStorage`).

## Como abrir para testar

É um site estático (PWA). Não precisa instalar nada complicado.

**Opção rápida (no computador):**
```bash
cd saude-mental
python3 -m http.server 8000
```
Depois abra `http://localhost:8000` no navegador.

**Como app no celular:** ao abrir o site publicado, o navegador oferece
"Adicionar à tela de início" — aí ele vira um app e funciona até offline.

## Base científica dos questionários

- **PHQ-9** (Patient Health Questionnaire): rastreio de depressão. Pontuação 0–27.
- **GAD-7** (Generalized Anxiety Disorder): rastreio de ansiedade. Pontuação 0–21.

São instrumentos de **rastreamento**, amplamente usados e de uso livre. Eles indicam
que vale procurar avaliação — **não** confirmam um diagnóstico.

## Próximos passos possíveis

- Diário de humor diário com gráfico.
- Lembretes gentis para se checar.
- Conteúdo de psicoeducação (o que é depressão, ansiedade, mitos).
- Localizador do CAPS mais próximo.
- Revisão dos textos por um profissional de saúde mental.
