import axios from 'axios';

export class BlueApiService {
  constructor() {
    this.apiToken = process.env.BLUE_API_TOKEN;
    this.companyId = process.env.BLUE_COMPANY_ID;
    this.baseUrl = 'https://api.blue.cc/graphql';
    
    if (!this.apiToken) {
      throw new Error('BLUE_API_TOKEN is required');
    }
  }

  async makeGraphQLRequest(query, variables = {}) {
    try {
      const response = await axios.post(this.baseUrl, {
        query,
        variables
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Blue.cc API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProjects() {
    const query = `
      query GetProjects($companyId: String!) {
        projectList(filter: { companyIds: [$companyId] }) {
          items {
            id
            name
            description
            updatedAt
          }
        }
      }
    `;

    const data = await this.makeGraphQLRequest(query, { companyId: this.companyId });
    return data.projectList.items;
  }

  async getTasks(projectId = null, limit = 50) {
    const query = `
      query GetTasks($filter: TaskFilterInput, $limit: Int) {
        taskList(filter: $filter, limit: $limit) {
          items {
            id
            title
            description
            status
            priority
            assigneeId
            projectId
            dueDate
            createdAt
            updatedAt
            tags
          }
        }
      }
    `;

    const filter = {};
    if (this.companyId) {
      filter.companyIds = [this.companyId];
    }
    if (projectId) {
      filter.projectIds = [projectId];
    }

    const data = await this.makeGraphQLRequest(query, { filter, limit });
    return data.taskList.items;
  }

  async searchSimilarTasks(title, description = '') {
    // Get all tasks and filter locally for similarity
    const allTasks = await this.getTasks();
    
    const searchTerms = this.extractKeywords(title + ' ' + description);
    const similarTasks = [];

    for (const task of allTasks) {
      const taskText = (task.title + ' ' + (task.description || '')).toLowerCase();
      const similarity = this.calculateSimilarity(searchTerms, taskText);
      
      if (similarity > 0.3) { // 30% similarity threshold
        similarTasks.push({
          ...task,
          similarity
        });
      }
    }

    return similarTasks.sort((a, b) => b.similarity - a.similarity);
  }

  extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'que', 'para', 'com', 'por', 'em', 'de', 'da', 'do', 'na', 'no'].includes(word));
  }

  calculateSimilarity(keywords, text) {
    const matchedKeywords = keywords.filter(keyword => text.includes(keyword));
    return matchedKeywords.length / keywords.length;
  }

  async createTask(taskData) {
    const query = `
      mutation CreateTask($input: TaskCreateInput!) {
        taskCreate(input: $input) {
          id
          title
          description
          status
          priority
          assigneeId
          projectId
          dueDate
          tags
        }
      }
    `;

    const input = {
      title: taskData.title,
      description: taskData.description,
      companyId: this.companyId,
      ...taskData
    };

    // Remove null/undefined values
    Object.keys(input).forEach(key => {
      if (input[key] === null || input[key] === undefined) {
        delete input[key];
      }
    });

    const data = await this.makeGraphQLRequest(query, { input });
    return data.taskCreate;
  }

  async updateTask(taskId, updates) {
    const query = `
      mutation UpdateTask($id: ID!, $input: TaskUpdateInput!) {
        taskUpdate(id: $id, input: $input) {
          id
          title
          description
          status
          priority
          assigneeId
          projectId
          dueDate
          tags
        }
      }
    `;

    // Remove null/undefined values
    const input = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        input[key] = updates[key];
      }
    });

    const data = await this.makeGraphQLRequest(query, { id: taskId, input });
    return data.taskUpdate;
  }

  async processTranscriptionTasks(extractedTasks) {
    const results = [];

    for (const task of extractedTasks) {
      try {
        // Search for similar tasks
        const similarTasks = await this.searchSimilarTasks(task.title, task.description);
        
        if (similarTasks.length > 0 && similarTasks[0].similarity > 0.7) {
          // Update existing similar task
          const existingTask = similarTasks[0];
          const updatedDescription = this.mergeDescriptions(existingTask.description, task.description);
          
          const updatedTask = await this.updateTask(existingTask.id, {
            description: updatedDescription,
            tags: [...new Set([...(existingTask.tags || []), ...(task.tags || [])])]
          });

          results.push({
            action: 'updated',
            task: updatedTask,
            originalTask: task,
            similarity: existingTask.similarity
          });
        } else {
          // Create new task
          const newTask = await this.createTask({
            title: task.title,
            description: task.description,
            priority: this.mapPriorityToBlue(task.priority),
            dueDate: task.deadline,
            tags: task.tags || ['reunião', 'transcription']
          });

          results.push({
            action: 'created',
            task: newTask,
            originalTask: task
          });
        }
      } catch (error) {
        console.error(`Error processing task "${task.title}":`, error);
        results.push({
          action: 'error',
          originalTask: task,
          error: error.message
        });
      }
    }

    return results;
  }

  mergeDescriptions(existing, newDesc) {
    if (!existing) return newDesc;
    if (!newDesc) return existing;
    
    return `${existing}

---
Atualização da reunião:
${newDesc}`;
  }

  mapPriorityToBlue(priority) {
    const priorityMap = {
      'high': 'HIGH',
      'medium': 'MEDIUM', 
      'low': 'LOW'
    };
    
    return priorityMap[priority] || 'MEDIUM';
  }

  async getCompanyInfo() {
    const query = `
      query GetCompany($id: ID!) {
        company(id: $id) {
          id
          name
          settings
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { id: this.companyId });
      return data.company;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  }

  async validateConnection() {
    try {
      if (this.companyId) {
        const company = await this.getCompanyInfo();
        console.log(`✅ Connected to Blue.cc - Company: ${company?.name || 'Unknown'}`);
        return true;
      } else {
        const projects = await this.getProjects();
        console.log(`✅ Connected to Blue.cc - Found ${projects.length} projects`);
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to connect to Blue.cc:', error.message);
      return false;
    }
  }
}