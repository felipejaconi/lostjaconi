# Arquitetura Financeira e Cálculos (ERP/WMS)

Esta documentação define a arquitetura matemática implementada usando a biblioteca `decimal.js` para garantir consistência financeira, evitar perdas de precisão devido à aritmética de ponto flutuante do JavaScript e manter-se em compliance com sistemas profissionais (SAP, Odoo, PHC).

## 1. Princípios Básicos

- **Sem Arredondamento Destrutivo Interno**: Durante os cálculos em memória, toda a precisão natural deve ser mantida. Apenas na etapa final e nas interfaces visuais de apresentação é que os valores devem ser arredondados para 2 (ou caso a caso 4) casas decimais.
- **A Verdade Fiscal é a Fatura (`Total Líquido`)**: Os sistemas financeiros importam os dados baseando-se no papel emitido pelo fornecedor. O `Total Líquido` gravado de cada linha é a base da verdade e o `Custo Unitário` é deduzido deste total dividido pelas quantidades. 
- **Biblioteca Oficial**: `decimal.js` (com `precision: 20` e arredondamento `ROUND_HALF_UP`).

## 2. Precisão por Campo

A fim de suportar cálculos avançados (custo médio ponderado, produtos por peso, Múltiplas Unidades de Medida) definiu-se a seguinte limitação visual/computacional das casas decimais:

| Campo / Grandeza      | Precisão Derivada | Uso / Regra                                                        |
|-----------------------|-------------------|--------------------------------------------------------------------|
| **Quantidades**       | 3 a 4 casas       | 3 casas base (0.001) ideal para gramas ou mililitros (ex. 1.250kg) |
| **Custo Unitário**    | até 6 casas       | Essencial para faturas fracionadas e Custo Médio Ponderado.          |
| **Total Líquido**     | 4 casas           | Representa o custo parcial exato (Qtd * Custo Un.).                  |
| **Total Apresentado** | 2 casas           | Representação UI (`toDecimalPlaces(2)`), moedas globais e SAF-T.     |

## 3. Fluxo Matemático (Entrada de Faturas)

### 3.1 Priorização de Variáveis (`updateItem`)

Ao preencher os dados de Entrada Manual, a lógica obedece à seguinte árvore de decisão (preservando o valor bruto):

1. **Alteração da `Quantidade` (Q)**: 
   - Se existir um `Total Líquido (TL)` já inserido $\rightarrow$ `Custo Unitário = TL / Q` (preserva o valor pago global).
   - Se faltar o `Total Líquido`, mas existir `Custo Unitário (CU)` $\rightarrow$ `Total Líquido = CU * Q`.
2. **Alteração do `Custo Unitário` (CU)**:
   - Recalcula e prevalece o `Total Líquido = CU * Q`.
3. **Alteração do `Total Líquido` (TL) [Recomendado Fiscalmente]**:
   - Assumindo a Qtd preenchida, o sistema recálcula e infere o custo base exato em armazém $\rightarrow$ `Custo Unitário = TL / Q`.

### 3.2 Cálculos Globais e IVA

Os totais do cabeçalho são agregados seguindo uma agregação rigorosa de tipos `Decimal` instanciados:

```typescript
// Acúmulos exatos (Apenas pseudocódigo do motor em AdminStockEntries.tsx)
let valorLiquido = new Decimal(0);
let creditoIva = new Decimal(0);

item_líquido = q.mul(custo_unitário);  // Preserva toda a precisão decimal
item_iva = item_líquido.mul(IVA_percentagem).div(100);

valorLiquido = valorLiquido.add(item_líquido);
creditoIva = creditoIva.add(item_iva);

Valor_Total = valorLiquido.add(creditoIva);
```

## 4. Próximos Passos WMS e Logística

Este fundamento matemático assegura que desenvolvimentos futuros como **Inventário Valorizado** e movimentos de Stock (Entradas via Lotes Múltiplos) possam consolidar as divisões decimais de forma neutra (Ex: divisão de custo por fretes de transporte), evadindo completamente inconsistências de "cêntimos perdidos" ao recalcular os agregados por categoria.
