# Fólio — A página certa para cada dúvida

Webapp educacional *mobile-first* desenvolvido para o currículo escolar de Moçambique (**1.ª à 12.ª classe**). Permite pesquisar qualquer tema escolar, ler o resumo didático e a pré-visualização da página exata, carregar livros em PDF para dissecção automática em capítulos/resumos e sincronizar manuais para leitura **100% offline encriptada**.

## Funcionalidades

- **Fluxo Mobile-First em 4 Estágios**: Splash screen, tela inicial de gancho com *Folha de Fólio* interativa, motor de busca curricular (com filtros por ciclo escolar e *Skeleton Shimmer*), pré-visualização editorial + checkout fintech (**M-Pesa** Vodacom 84/85 e **e-Mola** Movitel 86/87) e leitor didático offline.
- **Carregamento e Dissecção de Livros em PDF**: Extração página a página via `pdfjs-dist`, limpeza tipográfica, deteção automática de unidades/capítulos/disciplina/classe, geração de resumos didáticos, pontos-chave e conceitos indexados.
- **Leitor Adaptável Offline**: Temas **Papel** (`#f3ebd6`), **Sépia** (`#ebe0c5`) e **Noite** (`#041a11`), ajuste de fonte (`A-` / `A+`), marcadores de página, índice de capítulos e armazenamento encriptado offline (**AES-GCM + IndexedDB**).
- **Persistência em CockroachDB**: API Node.js + Express ligada ao CockroachDB (`folio_manuals`, `folio_chapters`, `folio_unlocks`).

## Como executar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com a sua DATABASE_URL do CockroachDB

# 3. Inicializar o esquema no CockroachDB
npm run db:init

# 4. Iniciar API + Frontend em paralelo
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api/health`

## Build de produção

```bash
npm run build
```
