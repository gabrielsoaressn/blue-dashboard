import OpenAI from 'openai';

export class TranscriptionSummarizer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async summarizeTranscription(transcriptionText, meetingTitle = '') {
    const prompt = `
Analise a seguinte transcrição de reunião e extraia as informações mais importantes:

${meetingTitle ? `Título da reunião: ${meetingTitle}` : ''}

Transcrição:
${transcriptionText}

Por favor, forneça um resumo estruturado com:

1. **Resumo Executivo** (2-3 frases principais)
2. **Participantes Mencionados** (se identificáveis)
3. **Decisões Tomadas** (lista de decisões importantes)
4. **Tarefas/Ações Identificadas** (extraia todas as tarefas mencionadas com responsáveis quando possível)
5. **Próximos Passos** (ações a serem tomadas)
6. **Prazos Mencionados** (se houver)

Foque especialmente nas tarefas e ações que precisam ser executadas. Para cada tarefa, tente identificar:
- O que precisa ser feito
- Quem é o responsável (se mencionado)
- Quando deve ser feito (se mencionado)
- Prioridade ou urgência (se indicada)

Formato de saída em JSON:
{
  "summary": "resumo executivo aqui",
  "participants": ["lista", "de", "participantes"],
  "decisions": ["decisão 1", "decisão 2"],
  "tasks": [
    {
      "title": "título da tarefa",
      "description": "descrição detalhada",
      "assignee": "responsável ou null",
      "deadline": "prazo ou null",
      "priority": "alta/média/baixa ou null"
    }
  ],
  "nextSteps": ["próximo passo 1", "próximo passo 2"],
  "deadlines": ["prazo 1", "prazo 2"]
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de reuniões e extração de tarefas. Sempre responda em português e no formato JSON solicitado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      
      // Try to parse JSON from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
      }

      // If JSON parsing fails, return a structured fallback
      return {
        summary: content,
        participants: [],
        decisions: [],
        tasks: [],
        nextSteps: [],
        deadlines: []
      };

    } catch (error) {
      console.error('Error summarizing transcription:', error);
      throw error;
    }
  }

  async extractTasksFromSummary(summary) {
    if (!summary.tasks || summary.tasks.length === 0) {
      return [];
    }

    // Process and enhance tasks
    return summary.tasks.map(task => ({
      title: task.title,
      description: task.description || task.title,
      assignee: task.assignee,
      deadline: task.deadline ? this.parseDeadline(task.deadline) : null,
      priority: this.mapPriority(task.priority),
      source: 'meeting-transcription',
      tags: ['reunião', 'transcription'],
      originalSummary: summary
    }));
  }

  parseDeadline(deadlineText) {
    if (!deadlineText || deadlineText === 'null') return null;

    // Simple date parsing - can be enhanced based on common patterns
    const today = new Date();
    const lowerDeadline = deadlineText.toLowerCase();

    if (lowerDeadline.includes('hoje')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lowerDeadline.includes('amanhã')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    if (lowerDeadline.includes('semana')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // Try to extract date patterns (dd/mm/yyyy, yyyy-mm-dd, etc.)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/
    ];

    for (const pattern of datePatterns) {
      const match = deadlineText.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    return deadlineText; // Return original text if no pattern matches
  }

  mapPriority(priority) {
    if (!priority || priority === 'null') return 'medium';

    const lowerPriority = priority.toLowerCase();
    
    if (lowerPriority.includes('alta') || lowerPriority.includes('urgent')) {
      return 'high';
    }
    
    if (lowerPriority.includes('baixa') || lowerPriority.includes('low')) {
      return 'low';
    }

    return 'medium';
  }
}