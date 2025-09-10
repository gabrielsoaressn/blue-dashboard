# 🎯 Meeting Transcription Manager

Sistema automatizado para processar transcrições de reuniões do Google Meet, criar resumos inteligentes e gerenciar tarefas no Blue.cc.

## 🚀 Funcionalidades

- **📄 Extração de Transcrições**: Busca automática por transcrições do Google Meet no Google Drive
- **🤖 Resumos Inteligentes**: Análise de transcrições usando IA para extrair informações relevantes
- **✅ Gerenciamento de Tarefas**: Criação e atualização automática de tarefas no Blue.cc
- **🔍 Detecção de Similaridade**: Evita duplicação identificando tarefas similares existentes
- **⏰ Agendamento**: Execução automática de segunda a sexta-feira

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Blue.cc com API habilitada
- Conta Google com acesso ao Google Drive
- Chave da API OpenAI

## 🔧 Configuração

### 1. Instalação

```bash
npm install
```

### 2. Configuração de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Blue.cc API
BLUE_API_TOKEN=pat_sua_chave_api_aqui
BLUE_COMPANY_ID=seu-company-id

# OpenAI
OPENAI_API_KEY=sua-chave-openai

# Google Drive API
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Configurações opcionais
TRANSCRIPTIONS_FOLDER_ID=id-da-pasta-google-drive
SCHEDULE_CRON=0 9 * * 1-5
```

### 3. Autenticação Google Drive

```bash
# Inicia processo de autenticação
node src/index.js auth

# Após autorizar, salve o token
node src/index.js auth-token <codigo-de-autorizacao>
```

### 4. Teste de Conexão

```bash
# Testa conexão com Blue.cc
node src/index.js test-blue

# Verifica status do sistema
node src/index.js status
```

## 📱 Uso

### Comandos Disponíveis

```bash
# Execução única
node src/index.js run-once

# Modo agendado (padrão: dias úteis às 9h)
node src/index.js schedule

# Modo agendado personalizado
node src/index.js schedule "0 10 * * 1-5"  # 10h nos dias úteis

# Configuração de autenticação
node src/index.js auth
node src/index.js auth-token <codigo>

# Utilitários
node src/index.js status
node src/index.js test-blue
node src/index.js help
```

### Scripts NPM

```bash
npm start          # Modo agendado padrão
npm run dev        # Desenvolvimento com reload
```

## 🔄 Fluxo de Funcionamento

1. **📂 Busca**: Identifica transcrições recentes no Google Drive
2. **📋 Análise**: Processa o conteúdo usando IA para extrair:
   - Resumo executivo
   - Participantes
   - Decisões tomadas
   - **Tarefas identificadas**
   - Próximos passos
   - Prazos mencionados

3. **🔍 Verificação**: Para cada tarefa identificada:
   - Busca tarefas similares no Blue.cc
   - Se encontrar (>70% similaridade): atualiza a existente
   - Se não encontrar: cria nova tarefa

4. **📊 Relatório**: Exibe resumo do processamento

## 🏗️ Estrutura do Projeto

```
src/
├── index.js                 # Aplicação principal
├── scheduler.js             # Agendamento e orquestração
├── googleDrive.js          # Interface Google Drive API
├── transcriptionSummarizer.js # Análise de transcrições com IA
└── blueApiService.js       # Interface Blue.cc API
```

## 🤖 Exemplo de Processamento

**Transcrição de entrada:**
> "João, você pode implementar o novo dashboard até sexta? Maria vai revisar o design amanhã."

**Tarefas extraídas:**
- 📋 "Implementar novo dashboard" (Responsável: João, Prazo: sexta-feira)
- 🎨 "Revisar design do dashboard" (Responsável: Maria, Prazo: amanhã)

## 🔧 Personalização

### Ajustar Critérios de Similaridade

Edite `blueApiService.js`, método `searchSimilarTasks()`:

```javascript
if (similarity > 0.3) { // Ajuste o threshold (0.3 = 30%)
```

### Modificar Prompt de Análise

Edite `transcriptionSummarizer.js`, método `summarizeTranscription()` para personalizar como a IA interpreta as transcrições.

### Configurar Agendamento

Use formato cron no arquivo `.env`:

```env
SCHEDULE_CRON=0 9 * * 1-5    # 9h nos dias úteis
SCHEDULE_CRON=0 14 * * *     # 14h todos os dias  
SCHEDULE_CRON=*/30 9-17 * * 1-5  # A cada 30min das 9h-17h nos dias úteis
```

## 🚨 Troubleshooting

### Problemas de Autenticação Google
```bash
# Re-execute o processo de auth
node src/index.js auth
rm token.json  # Remove token antigo se necessário
```

### Erro de Conexão Blue.cc
- Verifique se `BLUE_API_TOKEN` está correto
- Confirme se tem permissões para criar/editar tarefas
- Teste: `node src/index.js test-blue`

### Sem Transcrições Encontradas
- Verifique `TRANSCRIPTIONS_FOLDER_ID` no .env
- Confirme que as transcrições contêm palavras-chave como "transcript" ou "transcrição"
- Teste permissões do Google Drive

## 📈 Logs e Monitoramento

O sistema gera logs detalhados:
- ✅ Tarefas criadas
- 🔄 Tarefas atualizadas (com % de similaridade)
- ❌ Erros encontrados
- 📊 Resumo de processamento

## 🔐 Segurança

- Nunca commite arquivos `.env` ou `token.json`
- Use tokens com escopo mínimo necessário
- Revise regularmente as permissões das APIs

## 📞 Suporte

Para problemas relacionados ao Blue.cc API: support@blue.cc