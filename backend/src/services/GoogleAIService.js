
import axios from 'axios';
import dotenv from 'dotenv';
import Task from '../models/Task.js';
import Logger from '../utils/Logger.js';

dotenv.config();

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * @class GoogleAIService
 * @description Service for interacting with the Google AI Studio API.
 */
class GoogleAIService {
  /**
   * @constructor
   */
  constructor() {
    // TODO: Replace with your Google AI Studio API key in the .env file
    this.apiKey = process.env.GOOGLE_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.model = 'gemini-1.5-flash';
    this.validateApiKey();
  }

  /**
   * Validates that the API key is present.
   * @throws {Error} If the API key is not found in the environment variables.
   */
  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('Google AI API key not found. Please set GOOGLE_AI_API_KEY in your .env file.');
    }
  }

  /**
   * Builds the prompt for the Gemini model.
   * @param {string} content - The content of the meeting transcript.
   * @param {string} docName - The name of the document.
   * @returns {string} The optimized prompt.
   */
  buildPrompt(content, docName) {
    // For A/B testing different prompts, you could load prompts from a configuration
    // or database and select one based on a strategy (e.g., random, user segment).
    // Example: const promptTemplate = this.getPromptTemplate(promptVariant);

    return `
      Você é um assistente especializado em análise de atas de reunião.
      Analise o seguinte conteúdo de uma ata de reunião em português, intitulada "${docName}", com o objetivo de extrair todas as tarefas, ações e pendências de forma estruturada.

      Para cada tarefa identificada, extraia as seguintes informações, seguindo as diretrizes abaixo:

      1.  **Título (titulo)**: Um título conciso e descritivo da tarefa.
      2.  **Descrição (descricao)**: Uma descrição mais detalhada da tarefa, incluindo contexto relevante. Se a descrição for a mesma do título, pode ser omitida ou ser uma versão expandida.
      3.  **Responsável (responsavel)**: O nome completo da pessoa ou o nome da equipe explicitamente designada para a tarefa. Procure por frases como "João deve...", "Equipe de Marketing ficará responsável...", "Maria e Pedro vão...". Se não houver um responsável claro, retorne null.
      4.  **Prioridade (prioridade)**: Classifique a urgência da tarefa com base no contexto da reunião.
          *   'HIGH': Para tarefas críticas, com impacto imediato ou prazos muito curtos.
          *   'MEDIUM': Para tarefas importantes, com prazos definidos ou impacto moderado.
          *   'LOW': Para tarefas de menor urgência, sem prazo imediato ou com impacto menor.
          Se a prioridade não for clara, infira-a ou use 'MEDIUM'.
      5.  **Prazo (prazo)**: A data de vencimento da tarefa. Converta qualquer menção de data (ex: "até sexta", "final do dia 22/09", "próxima semana", "em 3 dias") para o formato YYYY-MM-DD. Se o ano não for especificado, assuma o ano corrente (2025). Se não houver prazo, retorne null.

      A saída deve ser um array de objetos JSON, onde cada objeto representa uma tarefa.
      O JSON deve ter a seguinte estrutura. Certifique-se de que a saída seja um JSON válido e que todos os campos estejam presentes, mesmo que com valor null:

      \`\`\`json
      [
        {
          "titulo": "Título da Tarefa 1",
          "descricao": "Descrição detalhada da Tarefa 1, incluindo o que precisa ser feito e o contexto.",
          "responsavel": "Nome do Responsável ou Equipe",
          "prioridade": "HIGH|MEDIUM|LOW",
          "prazo": "YYYY-MM-DD"
        },
        {
          "titulo": "Título da Tarefa 2",
          "descricao": "Descrição detalhada da Tarefa 2.",
          "responsavel": null,
          "prioridade": "MEDIUM",
          "prazo": "2025-10-05"
        }
      ]
      \`\`\`

      Se nenhuma tarefa for encontrada no conteúdo, retorne um array JSON vazio: \`[]\`.

      Conteúdo da Reunião para Análise:
      ---------------------------------
      ${content}
      ---------------------------------
    `;
  }

  /**
   * Extracts tasks from a document's content using the Google AI Studio API.
   * @param {string} documentContent - The content of the document.
   * @param {string} documentName - The name of the document.
   * @returns {Promise<Task[]>} An array of Task objects.
   */
  async extractTasks(documentContent, documentName) {
    const prompt = this.buildPrompt(documentContent, documentName);
    const url = `${API_ENDPOINT}${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    try {
      Logger.info(`Sending request to Google AI for document: ${documentName}`);
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      });

      if (response.status === 200 && response.data.candidates && response.data.candidates.length > 0) {
        const rawJson = response.data.candidates[0].content.parts[0].text;
        const tasksData = JSON.parse(rawJson.replace(/```json|```/g, '').trim());

        if (!Array.isArray(tasksData)) {
          throw new Error('Malformed response from AI: expected a JSON array.');
        }

        Logger.info(`Successfully extracted ${tasksData.length} tasks from ${documentName}`);

        return tasksData.map(
          (taskData) =>
            new Task({
              title: taskData.titulo,
              description: taskData.descricao,
              assignee: taskData.responsavel,
              priority: taskData.prioridade,
              dueDate: taskData.prazo,
              sourceDocument: documentName,
            })
        );
      } else {
        throw new Error('No content generated by the AI or invalid response structure.');
      }
    } catch (error) {
      Logger.error(`Error extracting tasks from ${documentName}: ${error.message}`);
      if (error.response) {
        if (error.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Invalid Google AI API key.');
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('API request timed out.');
      }
      throw error;
    }
  }
}

export default new GoogleAIService();
