/**
 * @typedef {'file' | 'googledrive' | 'upload'} DocumentSource
 */

/**
 * Representa um documento de reunião.
 */
class Document {
  /**
   * @param {object} data - Os dados para criar o documento.
   * @param {string} data.id - O ID do documento.
   * @param {string} data.name - O nome do arquivo do documento.
   * @param {string} data.content - O conteúdo textual do documento.
   * @param {DocumentSource} data.source - A origem do documento.
   * @param {Date} [data.createdAt] - A data de criação. O padrão é a data atual.
   * @param {object} [data.metadata] - Metadados adicionais.
   */
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.content = data.content;
    this.source = data.source;
    this.createdAt = data.createdAt || new Date();
    this.metadata = data.metadata || {};

    this.validate();
  }

  /**
   * Valida as propriedades obrigatórias do documento.
   * @throws {Error} Se uma propriedade obrigatória estiver faltando ou for inválida.
   */
  validate() {
    if (!this.id || typeof this.id !== 'string') {
      throw new Error('O ID do documento é obrigatório e deve ser uma string.');
    }
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('O nome do documento é obrigatório e deve ser uma string.');
    }
    if (this.content === undefined || this.content === null) {
        throw new Error('O conteúdo do documento é obrigatório.');
    }
    const validSources = ['file', 'googledrive', 'upload'];
    if (!this.source || !validSources.includes(this.source)) {
      throw new Error(`A origem do documento deve ser uma das seguintes: ${validSources.join(', ')}.`);
    }
  }

  /**
   * Verifica se o documento tem conteúdo.
   * @returns {boolean} Verdadeiro se o conteúdo não for nulo ou vazio.
   */
  hasContent() {
    return this.content && this.content.trim().length > 0;
  }

  /**
   * Conta o número de palavras no conteúdo do documento.
   * @returns {number} O número de palavras.
   */
  getWordCount() {
    if (!this.hasContent()) {
      return 0;
    }
    return this.content.trim().split(/\s+/).length;
  }

  /**
   * Serializa o objeto Document para JSON.
   * @returns {object} Uma representação JSON do documento.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      content: this.content,
      source: this.source,
      createdAt: this.createdAt.toISOString(),
      metadata: this.metadata,
      wordCount: this.getWordCount(),
    };
  }
}

export default Document;
