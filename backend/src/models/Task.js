import { randomUUID } from 'crypto';

/**
 * @typedef {'LOW' | 'MEDIUM' | 'HIGH'} TaskPriority
 * @typedef {'PENDING' | 'IN_PROGRESS' | 'DONE'} TaskStatus
 */

/**
 * Representa uma tarefa extraída de uma reunião.
 */
class Task {
  /**
   * @param {object} data - Os dados para criar a tarefa.
   * @param {string} data.title - O título da tarefa.
   * @param {string} data.sourceDocument - O ID do documento de origem.
   * @param {string} [data.description] - A descrição da tarefa.
   * @param {string} [data.assignee] - A pessoa designada para a tarefa.
   * @param {TaskPriority} [data.priority='MEDIUM'] - A prioridade da tarefa.
   * @param {Date} [data.dueDate] - A data de vencimento da tarefa.
   * @param {string[]} [data.tags=[]] - Tags associadas à tarefa.
   * @param {TaskStatus} [data.status='PENDING'] - O status da tarefa.
   */
  constructor(data) {
    this.id = randomUUID();
    this.title = data.title;
    this.description = data.description || '';
    this.assignee = data.assignee;
    this.priority = data.priority || 'MEDIUM';
    this.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    this.tags = data.tags || [];
    this.status = data.status || 'PENDING';
    this.sourceDocument = data.sourceDocument;
    this.createdAt = new Date();

    this.validate();
  }

  /**
   * Valida as propriedades da tarefa.
   * @throws {Error} Se a validação falhar.
   */
  validate() {
    if (!this.title || typeof this.title !== 'string') {
      throw new Error('O título da tarefa é obrigatório e deve ser uma string.');
    }
    if (!this.sourceDocument || typeof this.sourceDocument !== 'string') {
        throw new Error('O ID do documento de origem é obrigatório.');
    }
    this.setPriority(this.priority); // Valida a prioridade inicial
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(this.status)) {
        throw new Error(`Status inválido. Use um dos seguintes: ${validStatuses.join(', ')}.`);
    }
  }

  /**
   * Define a prioridade da tarefa após validação.
   * @param {TaskPriority} priority - A nova prioridade.
   * @throws {Error} Se a prioridade for inválida.
   */
  setPriority(priority) {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Prioridade inválida. Use uma das seguintes: ${validPriorities.join(', ')}.`);
    }
    this.priority = priority;
  }

  /**
   * Adiciona uma tag à tarefa, se ela ainda não existir.
   * @param {string} tag - A tag a ser adicionada.
   */
  addTag(tag) {
    if (tag && typeof tag === 'string' && !this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Verifica se a tarefa está atrasada.
   * @returns {boolean} Verdadeiro se a data de vencimento passou e o status não é 'DONE'.
   */
  isOverdue() {
    return this.dueDate && this.dueDate < new Date() && this.status !== 'DONE';
  }

  /**
   * Serializa o objeto Task para JSON.
   * @returns {object} Uma representação JSON da tarefa.
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      assignee: this.assignee,
      priority: this.priority,
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      tags: this.tags,
      status: this.status,
      sourceDocument: this.sourceDocument,
      createdAt: this.createdAt.toISOString(),
      isOverdue: this.isOverdue(),
    };
  }
}

export default Task;
