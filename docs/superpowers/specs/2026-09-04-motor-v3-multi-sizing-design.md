# Motor V3 — Contrato de Multi-Sizing Certificado

## Objetivo

Evoluir o contrato de sizing do Motor V3 para representar múltiplos tamanhos certificados da mesma ação dentro do mesmo node, preservando a semântica da ação (`raise`, `bet`, etc.), a proveniência solver, o fallback V2 e a regra de não dirigir o live sem evidência mão-a-mão suficiente.

A necessidade surge da validação externa: materiais oficiais do GTO Wizard exibem nodes em que uma mesma ação estratégica possui mais de um sizing candidato no mesmo spot. O contrato atual `actionSizeBB?: Partial<Record<BlindWarAction, number>>` só consegue guardar um valor por ação e, portanto, perde informação solver relevante.

## Princípios obrigatórios

1. A ação continua sendo uma dimensão separada do sizing. Não criar ações artificiais como `raise3.5` ou `raise7`.
2. Um benchmark pode conter zero, um ou vários sizings certificados para a mesma ação.
3. Frequência global de ação e frequência de sizing são dimensões distintas.
4. Um sizing não pode ser usado no live apenas porque existe no node global; é necessário saber que aquele sizing é válido para a mão certificada que está dirigindo a decisão.
5. Ausência de frequência mão-a-mão por sizing mantém o node em shadow/fallback para a escolha de sizing, mesmo que a ação em si seja certificada.
6. O contrato deve preservar compatibilidade semântica com fixtures atuais de sizing único, especialmente BW5 `raise -> 3bb`.
7. Nenhuma frequência ou distribuição deve ser inferida por proporção visual ambígua.
8. `CERTIFIED` continua exigindo contexto exato e evidência solver inequívoca.

## Modelo de dados recomendado

### Distribuição de sizing por ação

Substituir o conceito de valor único por uma lista estruturada por ação:

```ts
export interface CertifiedSizingOption {
  sizeBB: number;
  freq?: number;
}

export type ActionSizingDistribution = Partial<
  Record<BlindWarAction, CertifiedSizingOption[]>
>;
```

Cada opção representa um sizing explicitamente visível no benchmark.

`freq` é opcional porque a fonte pode certificar a existência do sizing sem mostrar uma frequência confiável. Se nenhuma ou apenas parte das opções tiver `freq`, o contrato preserva essa ausência de precisão; o validator não completa nem normaliza os valores. A soma 1 só é exigida quando todas as opções da ação tiverem frequência declarada.

### Fixture

`ExternalBenchmarkFixture` passa a expor:

```ts
actionSizing?: ActionSizingDistribution;
```

O campo legado `actionSizeBB` será removido depois que os fixtures existentes forem migrados; não manter dois contratos ativos permanentemente.

Exemplo BW5 atual:

```ts
actionSizing: {
  raise: [{ sizeBB: 3, freq: 1 }],
}
```

Nesse caso `freq: 1` significa: dentro da ação raise certificada para aquele branch de sizing, o único sizing certificado é 3bb. Não significa que o node inteiro raise 100% das mãos.

Exemplo conceitual de multi-sizing:

```ts
actionSizing: {
  raise: [
    { sizeBB: 3.5, freq: 0.65 },
    { sizeBB: 7, freq: 0.35 },
  ],
}
```

Só armazenar essas frequências se a fonte realmente as mostrar.

## Frequência mão-a-mão por sizing

Para o live, a ação pura da mão não é suficiente quando existem múltiplos sizings possíveis.

Adicionar contrato opcional separado:

```ts
export type HandSizingFreq = Record<number, number>;

handSizingFreq?: Record<
  string,
  Partial<Record<BlindWarAction, HandSizingFreq>>
>;
```

Exemplo:

```ts
handActionFreq: {
  A5s: { raise: 1 },
},
handSizingFreq: {
  A5s: {
    raise: {
      3.5: 0.4,
      7: 0.6,
    },
  },
},
```

Regras:
- frequências por sizing da mão devem ser finitas, em `[0,1]`, e somar 1 dentro da ação;
- sizings referenciados por `handSizingFreq` devem existir em `actionSizing` para a mesma ação;
- se `handActionFreq` disser `raise: 1` e houver exatamente um sizing certificado para `raise`, o live pode usar esse sizing sem exigir `handSizingFreq` explícito;
- se houver mais de um sizing certificado e não houver `handSizingFreq` para a mão, o adapter não escolhe arbitrariamente: retorna `null` e o V2 continua autoritativo para sizing/decisão live;
- estratégias mistas por ação continuam shadow-only no estágio atual.

## Bridge

`LivePreflopV3Result` deve carregar:

```ts
actionSizing?: ActionSizingDistribution;
handSizingMix?: Partial<Record<V3SemanticPreflopAction, HandSizingFreq>>;
```

O bridge apenas transporta dados certificados do fixture exato. Não resolve preferência, não normaliza frequências ausentes e não inventa sizing.

Validações no bridge:
- `handActionFreq` continua somando 1;
- `handSizingFreq` só é aceito quando sua mão/ação existe;
- todos os `sizeBB` devem ser finitos e positivos; para `raise` pré-flop não-all-in devem ser maiores que 1bb;
- quando todas as opções globais de sizing de uma ação declararem `freq`, essas frequências devem somar 1; se a fonte não declarar a distribuição completa, preservar `freq` ausente sem inventar normalização;
- frequências mão-a-mão por sizing declaradas devem sempre somar 1 dentro da ação;
- sizings mão-a-mão precisam pertencer ao conjunto de sizings globais certificados da ação.

## Adapter live

O `mapCertifiedV3PreflopDecision` mantém a regra de só mapear estratégia de ação pura.

Para `raise`:

1. Se existe exatamente um sizing certificado para `raise`, usar esse sizing.
2. Se existem vários sizings e a mão tem exatamente um sizing com frequência 100%, usar esse sizing.
3. Se existem vários sizings e a mão mistura entre sizings, continuar shadow-only nesta entrega; não usar RNG live ainda.
4. Se existem vários sizings sem `handSizingFreq` da mão, fallback V2.
5. Se sizing é inválido, fallback V2.

Isso preserva a política atual: o V3 só substitui o V2 quando a evidência mão-a-mão é suficiente para uma decisão determinística e auditável.

## Compatibilidade com BW5

O BW5 atual deve continuar produzindo exatamente o mesmo comportamento live:
- `T3s -> raise 3bb`;
- limps e folds certificados permanecem idênticos;
- AKo não certificado continua `FALLBACK_V2`;
- contexto vizinho continua `FALLBACK_V2`.

A migração de `actionSizeBB: { raise: 3 }` para `actionSizing: { raise: [{ sizeBB: 3, freq: 1 }] }` não pode alterar o resultado externo do adapter.

## TDD e invariantes obrigatórios

### Contrato
- fixture aceita um sizing único;
- fixture aceita dois sizings para a mesma ação;
- sizing inválido é rejeitado pelo caminho de validação;
- distribuição global completa com frequências que não somam 1 é rejeitada;
- distribuição global incompleta mantém `freq` ausente sem normalização artificial.

### Bridge
- sizing único é transportado sem alteração;
- multi-sizing é transportado sem colapsar para um único valor;
- `handSizingFreq` válido é transportado;
- sizing de mão fora do conjunto global certificado é rejeitado;
- frequências de sizing da mão que não somam 1 são rejeitadas.

### Adapter
- raise puro + sizing único -> decisão live com sizing correto;
- raise puro + múltiplos sizings + sem hand sizing -> fallback V2;
- raise puro + múltiplos sizings + sizing mão-a-mão puro -> decisão live correta;
- raise puro + múltiplos sizings + mix mão-a-mão -> shadow/fallback nesta entrega;
- BW5 T3s permanece raise 3bb;
- BW5 A4s/A3s/A2s/K4s/K3s/Q4s continuam limp;
- BW5 72o/62o/52o/42o continuam fold;
- AKo e contextos próximos continuam fallback.

## Não objetivos desta entrega

- Não executar RNG de sizing misto no live.
- Não transformar ações em strings codificadas por tamanho.
- Não migrar pós-flop ainda.
- Não inferir frequência de sizing a partir de área de cor no grid.
- Não promover BW1-BW4 sem composição mão-a-mão suficiente.
- Não remover o fallback V2.
- Não alterar UI, Instagram, funil ou painel Seu Jogo.

## Critério de sucesso

A entrega é concluída quando:
- o contrato representa múltiplos sizings certificados por ação;
- o bridge preserva a distribuição completa;
- o adapter usa sizing único ou mão-a-mão puro somente quando a evidência permite;
- multi-sizing ambíguo não dirige live;
- BW5 mantém comportamento idêntico;
- toda a suíte e build passam no PR draft;
- nenhum merge em `main` ocorre automaticamente.
