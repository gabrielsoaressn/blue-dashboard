# Blue Dashboard - Task Extractor

Bem-vindo ao Blue Dashboard, uma aplicação full-stack que utiliza Inteligência Artificial (Google Gemini) para extrair tarefas, ações e pendências de documentos de texto, como atas de reunião. O sistema é composto por um backend Node.js (Express) e um frontend Streamlit (Python).

## Funcionalidades

- **Extração Inteligente de Tarefas:** Utiliza o modelo Gemini 1.5 Flash para identificar e estruturar tarefas, responsáveis, prioridades e prazos a partir de texto livre.
- **Interface Amigável:** Frontend intuitivo em Streamlit para upload de arquivos ou inserção de texto direto.
- **Visualização de Resultados:** Exibição clara das tarefas extraídas, com opções de filtro, ordenação e exportação (JSON/CSV).
- **Histórico de Processamentos:** Mantenha um registro das suas análises anteriores.
- **Estatísticas:** Gráficos e métricas para entender a distribuição das tarefas.
- **Sistema de Logging Robusto:** Backend com logging configurável por nível e saída (console/arquivo).
- **Testes Abrangentes:** Conjunto de testes para CLI, API e UI para garantir a estabilidade do sistema.

## Estrutura do Projeto

```
blue-dashboard/
├── backend/                  # Aplicação Node.js (Express) para a API e lógica de IA
│   ├── src/                  # Código fonte do backend
│   │   ├── app.js            # Configuração principal do Express
│   │   ├── cli.js            # Interface de Linha de Comando (CLI)
│   │   ├── server.js         # Ponto de entrada do servidor
│   │   ├── controllers/      # Controladores da API
│   │   ├── models/           # Modelos de dados (e.g., Task.js)
│   │   ├── routes/           # Definições de rotas da API
│   │   ├── services/         # Serviços de lógica de negócio (e.g., GoogleAIService.js)
│   │   └── utils/            # Utilitários (e.g., Logger.js)
│   └── tests/                # Testes do backend
├── frontend/                 # Aplicação Streamlit (Python) para a interface do usuário
│   ├── components/           # Componentes reutilizáveis da UI
│   ├── services/             # Cliente da API para comunicação com o backend
│   ├── utils/                # Utilitários do frontend
│   └── app.py                # Aplicação principal do Streamlit
├── shared/                   # Arquivos e dados compartilhados (e.g., arquivos de exemplo)
├── .env.example              # Exemplo de variáveis de ambiente
├── package.json              # Dependências e scripts do projeto Node.js
├── requirements.txt          # Dependências do projeto Python
└── run-full-test.sh          # Script para executar todos os testes
```

## Setup e Instalação

Siga os passos abaixo para configurar e rodar a aplicação localmente.

### Pré-requisitos

- Node.js (v18 ou superior)
- npm (gerenciador de pacotes do Node.js)
- Python (v3.8 ou superior)
- pip (gerenciador de pacotes do Python)
- Uma chave de API do Google AI Studio (Gemini). Você pode obtê-la em [Google AI Studio](https://aistudio.google.com/app/apikey).

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/blue-dashboard.git
cd blue-dashboard
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do diretório `backend/` e outro na raiz do diretório `frontend/` com base nos arquivos `.env.example` fornecidos.

**`backend/.env`:**

```env
PORT=3000
GOOGLE_AI_API_KEY=SUA_CHAVE_API_DO_GOOGLE_AI
# Opcional: Configurações para integração com Google Drive (se aplicável)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=

# Configurações de Logging
LOG_LEVEL=info # Níveis: debug, info, warn, error
LOG_FILE_PATH=./app.log # Opcional: caminho para o arquivo de log (ex: ./app.log)
```

**`frontend/.env`:**

```env
API_BASE_URL=http://127.0.0.1:3000/api # Certifique-se de que a porta corresponde à do backend
```

### 3. Instalar Dependências do Backend

```bash
cd backend
npm install
cd ..
```

### 4. Instalar Dependências do Frontend

```bash
cd frontend
pip install -r requirements.txt
cd ..
```

### 5. Rodar a Aplicação

#### Iniciar o Backend (API)

```bash
cd backend
npm start
```

O servidor backend estará rodando em `http://localhost:3000` (ou na porta configurada no `.env`).

#### Iniciar o Frontend (Streamlit)

Em um novo terminal, na raiz do projeto:

```bash
cd frontend
streamlit run app.py
```

O frontend será aberto automaticamente no seu navegador, geralmente em `http://localhost:8501`.

## Uso da CLI (Backend)

O backend também oferece uma interface de linha de comando para processar arquivos diretamente.

```bash
cd backend
node src/cli.js process "/caminho/para/seu/arquivo.txt" --save -o saida.json
node src/cli.js batch "/caminho/para/seu/diretorio" --save
```

## Testes

Para rodar todos os testes (backend CLI, backend API e frontend UI), execute o script na raiz do projeto:

```bash
./run-full-test.sh
```

Este script iniciará os servidores em background, executará os testes e fará a limpeza.

## Documentação da API

As rotas da API são definidas em `backend/src/routes/api.js`. Para uma documentação mais detalhada, você pode usar ferramentas como JSDoc para gerar documentação a partir dos comentários no código ou integrar uma solução como Swagger/OpenAPI.

**Endpoints Principais:**

- `GET /api/health`: Verifica o status da API.
- `POST /api/upload`: Faz upload de um arquivo de texto e extrai tarefas.
- `POST /api/process-text`: Processa texto diretamente e extrai tarefas.
- `POST /api/process-file`: Processa um arquivo local no servidor (usado internamente pela CLI e outros serviços).

## Guia de Solução de Problemas (Troubleshooting)

- **API indisponível no frontend:**
    - Verifique se o backend está rodando (`npm start` no diretório `backend`).
    - Confirme se `API_BASE_URL` no `frontend/.env` corresponde à porta do backend.
    - Verifique o console do backend para erros de inicialização.
- **Erro de chave de API do Google AI:**
    - Certifique-se de que `GOOGLE_AI_API_KEY` está corretamente configurada em `backend/.env`.
    - Verifique se a chave é válida e tem permissões para o modelo Gemini 1.5 Flash.
- **Nenhuma tarefa extraída ou resultados inesperados:**
    - O modelo de IA pode ter dificuldade com textos muito ambíguos ou mal formatados. Tente refinar o texto de entrada.
    - Verifique os logs do backend (se `LOG_FILE_PATH` estiver configurado) para mensagens de erro da API do Google AI.
- **Problemas de dependências:**
    - Certifique-se de que `npm install` (backend) e `pip install -r requirements.txt` (frontend) foram executados sem erros.

## Configurações de Produção (Opcional)

Para um ambiente de produção, considere as seguintes melhorias:

- **Validação de Ambiente:** Implemente validações mais robustas para todas as variáveis de ambiente críticas.
- **Rate Limiting:** Use middleware como `express-rate-limit` no backend para proteger contra abusos.
- **Security Headers:** Utilize `helmet` no Express para configurar cabeçalhos HTTP de segurança.
- **Monitoramento de Erros:** Integre com serviços como Sentry, New Relic ou Datadog para monitoramento proativo de erros e performance.
- **HTTPS:** Configure um proxy reverso (Nginx, Caddy) para servir a aplicação via HTTPS.
- **Gerenciamento de Processos:** Use um gerenciador de processos como PM2 para manter o backend rodando de forma confiável.

## Docker Setup (Opcional)

Para facilitar a implantação e garantir um ambiente consistente, você pode usar Docker.

### Dockerfile para o Backend

Crie um arquivo `Dockerfile` no diretório `backend/`:

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

### Dockerfile para o Frontend

Crie um arquivo `Dockerfile` no diretório `frontend/`:

```dockerfile
# frontend/Dockerfile
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### Docker Compose (na raiz do projeto)

Crie um arquivo `docker-compose.yml` na raiz do projeto:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app # Para desenvolvimento, remova em produção

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "8501:8501"
    env_file:
      - ./frontend/.env
    volumes:
      - ./frontend:/app # Para desenvolvimento, remova em produção
    depends_on:
      - backend

networks:
  default:
    driver: bridge
```

Para construir e iniciar os contêineres:

```bash
docker-compose up --build
```

Para parar e remover os contêineres:

```bash
docker-compose down
```

## Contribuição

Sinta-se à vontade para contribuir! Abra issues para bugs ou sugestões e Pull Requests para novas funcionalidades ou melhorias.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
