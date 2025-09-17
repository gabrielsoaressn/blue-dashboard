import axios from 'axios';

export class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async analyzeMeetingSummary(content, documentName = 'Meeting Summary') {
    try {
      const prompt = `
Analise o seguinte resumo de reunião e extraia as tarefas (tasks) que precisam ser criadas.

Para cada tarefa, forneça:
1. Título da tarefa (título claro e objetivo)
2. Descrição detalhada da tarefa
3. Responsável (se mencionado)
4. Prioridade (Alta, Média, Baixa)
5. Prazo (se mencionado)

Formato de saída (JSON):
{
  "tasks": [
    {
      "title": "Título da tarefa",
      "description": "Descrição detalhada do que precisa ser feito",
      "assignee": "Nome do responsável ou null",
      "priority": "Alta|Média|Baixa",
      "dueDate": "YYYY-MM-DD ou null",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Documento: ${documentName}

Conteúdo:
${content}
`;

      const response = await axios.post(this.baseURL, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      const responseText = response.data.content[0].text;
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(responseText);
        return parsed.tasks || [];
      } catch (parseError) {
        // If JSON parsing fails, try to extract tasks manually
        console.warn('Failed to parse JSON response, attempting manual extraction');
        return this.extractTasksFromText(responseText);
      }

    } catch (error) {
      console.error('Error analyzing meeting summary with Claude:', error);
      throw error;
    }
  }

  extractTasksFromText(text) {
    // Simple fallback method to extract tasks from text
    const tasks = [];
    const lines = text.split('\n');
    
    let currentTask = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for task indicators
      if (trimmedLine.includes('título') || trimmedLine.includes('title')) {
        if (currentTask) {
          tasks.push(currentTask);
        }
        currentTask = {
          title: trimmedLine.replace(/.*título.*?:/i, '').replace(/.*title.*?:/i, '').trim(),
          description: '',
          assignee: null,
          priority: 'Média',
          dueDate: null,
          tags: []
        };
      } else if (currentTask && trimmedLine.includes('descrição')) {
        currentTask.description = trimmedLine.replace(/.*descrição.*?:/i, '').trim();
      } else if (currentTask && trimmedLine.includes('responsável')) {
        currentTask.assignee = trimmedLine.replace(/.*responsável.*?:/i, '').trim();
      } else if (currentTask && trimmedLine.includes('prioridade')) {
        currentTask.priority = trimmedLine.replace(/.*prioridade.*?:/i, '').trim();
      }
    }
    
    if (currentTask) {
      tasks.push(currentTask);
    }
    
    return tasks;
  }

  async validateConnection() {
    try {
      // Simple test to validate API key
      const response = await axios.post(this.baseURL, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      
      return response && response.data && response.data.content && response.data.content.length > 0;
    } catch (error) {
      console.error('Claude API validation failed:', error);
      return false;
    }
  }
}