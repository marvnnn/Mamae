# Lau SemiJoias - Sistema de Gerenciamento

Sistema de gerenciamento para loja de semijoias com dashboard, controle de estoque, cadastro de produtos e registro de vendas.

## Como Usar

### No Computador

1. **Abrir o sistema**: Basta dar dois cliques no arquivo `index.html` ou arrastá-lo para o navegador
2. **Navegadores suportados**: Chrome, Edge, Firefox, Safari

### Migrar para Outro Computador

Os dados ficam salvos no navegador de cada computador. Para migrar:

1. **No computador antigo**:
   - Abra o sistema
   - Vá em **Configurações** (menu lateral)
   - Clique em **Exportar Dados**
   - Salve o arquivo JSON gerado

2. **No computador novo**:
   - Copie o arquivo `index.html` para o novo computador
   - Abra o sistema
   - Vá em **Configurações**
   - Clique em **Importar Dados** e selecione o arquivo JSON exportado

## Funcionalidades

- **Cadastro de Joias**: Geração automática de códigos por tipo (Brinco, Colar, Anel, etc.)
- **Controle de Estoque**: Filtros por tipo e status, baixa automática após venda
- **Dashboard**: 
  - Total vendido no mês
  - Peças vendidas
  - Ticket médio
  - Lucro total
  - Vendas por semana (gráfico de barras)
  - Produtos mais vendidos por tipo (gráfico de pizza)
- **Vendas**: Carrinho de compras, desconto percentual ou fixo, registro de cliente
- **Backup**: Exportar e importar dados para migrar entre computadores

## Estrutura do Projeto

```
projetomae/
├── index.html          # Sistema completo (frontend + banco de dados IndexedDB)
└── README.md           # Este arquivo
```

## Como Funciona o Armazenamento

O sistema usa **IndexedDB**, um banco de dados nativo do navegador. Isso significa:

- ✅ Não precisa instalar nada (Node.js, Python, etc.)
- ✅ Não precisa de servidor ou internet
- ✅ Os dados ficam salvos mesmo se fechar o navegador
- ✅ Funciona offline
- ⚠️ Os dados ficam salvos apenas no navegador e computador onde foi usado
- ⚠️ Para usar em outro computador, use a função de Exportar/Importar dados

## Dicas

- **Faça backup regularmente**: Exporte os dados uma vez por semana ou após vendas importantes
- **Guarde o arquivo de backup**: Salve o JSON exportado em um local seguro (pendrive, nuvem, etc.)
- **Use sempre o mesmo navegador**: Os dados são específicos do navegador (Chrome, Edge, etc.)
