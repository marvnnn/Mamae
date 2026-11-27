# 💎 Lau SemiJoias — Sistema de Gerenciamento

Sistema web para gerenciar o estoque e as vendas de semijoias e joias em prata.
Roda inteiro no navegador: não precisa de servidor, banco de dados ou instalação.

## Funcionalidades

- **Cadastro**: registra peças (brinco, colar, anel, pulseira, conjunto, bracelete e piercing) com código gerado automaticamente e material (Prata 925, Prata 925 - R, Semi Joia).
- **Estoque**: lista, edita e exclui peças, e marca como vendida ou disponível.
- **Dashboard**: resumo do estoque e das vendas, com gráficos.
- **Vendas**: histórico das vendas feitas.
- **Configurações**: backup (exporta um arquivo `.json`) e restauração (importa o backup).

## Estrutura do projeto

| Arquivo | O que é |
|---|---|
| `index.html` | **Versão principal.** O sistema completo num só arquivo (React, Babel e Chart.js vêm de CDN). Salva os dados no IndexedDB do navegador. |
| `jewelry-app.jsx` | Versão alternativa em componente React, para usar num projeto com bundler (Vite, por exemplo). Salva os dados no `localStorage`. |
| `README.md` | Este arquivo. |

## Como rodar

### Pré-requisitos

- Um navegador atualizado (Chrome, Edge, Firefox ou Safari).
- **Conexão com a internet** na primeira vez que abrir, porque as bibliotecas (React, Babel, Chart.js e as fontes) são baixadas de CDN.
- [Git](https://git-scm.com/) para baixar o projeto (ou baixe o ZIP pelo GitHub em **Code → Download ZIP**).

### 1. Baixar o projeto

```bash
git clone https://github.com/marvnnn/Mamae.git
```

```bash
cd Mamae
```

### 2. Abrir o sistema

**Opção A: abrir direto (mais simples)**

Dê dois cliques no arquivo `index.html`. Ele abre no navegador e já funciona.

**Opção B: com um servidor local (recomendado)**

Alguns navegadores limitam o armazenamento quando a página é aberta como arquivo (`file://`).
Com um servidor local os dados ficam guardados de forma mais confiável. Escolha uma das opções:

Com Python (já vem no macOS e na maioria dos Linux):

```bash
python3 -m http.server 8000
```

Ou com Node.js:

```bash
npx serve .
```

Depois abra no navegador o endereço mostrado no terminal (no Python, `http://localhost:8000`).
Para parar o servidor, aperte `Ctrl + C` no terminal.

> **Importante:** use sempre o mesmo endereço (ex.: sempre `http://localhost:8000`).
> Os dados ficam salvos por endereço e por navegador: se mudar a porta ou o navegador, o estoque aparece vazio.

### Rodando a versão `jewelry-app.jsx` (opcional, para desenvolvimento)

Precisa do [Node.js](https://nodejs.org/) 18 ou mais recente.

```bash
npm create vite@latest lau-semijoias -- --template react
```

```bash
cd lau-semijoias
```

```bash
npm install
```

Copie o `jewelry-app.jsx` para `src/` e troque o conteúdo de `src/main.jsx` por:

```jsx
import './jewelry-app.jsx';
```

Depois rode:

```bash
npm run dev
```

e abra `http://localhost:5173`.

## Onde ficam os dados

Tudo fica salvo **no próprio navegador** do computador em que o sistema foi usado.
Nada é enviado para a internet. Por isso:

- Limpar os dados de navegação do site apaga o estoque.
- Outro computador ou navegador não vê os mesmos dados.

**Faça backup com frequência:** em **Configurações → Exportar**, baixe o arquivo `.json`.
Para levar os dados para outro computador, ou recuperá-los, use **Configurações → Importar** com esse arquivo.

> As duas versões guardam os dados em lugares diferentes (`index.html` no IndexedDB e `jewelry-app.jsx` no `localStorage`), então os dados de uma não aparecem na outra.

## Colocar online (opcional)

Por ser só um arquivo HTML, dá para publicar de graça no **GitHub Pages**:

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`.
3. Salve. Em alguns minutos o site fica disponível em `https://marvnnn.github.io/Mamae/`.

Mesmo online, cada pessoa continua com os dados guardados no próprio navegador.

## Tecnologias

- [React 18](https://react.dev/)
- [Babel Standalone](https://babeljs.io/docs/babel-standalone) (compila o JSX no navegador)
- [Chart.js](https://www.chartjs.org/) (gráficos do dashboard)
- IndexedDB / localStorage (armazenamento local)
