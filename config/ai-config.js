const aiModels = {
    openai: {
        name: 'QwQ-32B',
        apiBase: 'http://125.71.97.27:8000/QwQ/v1',
        models: ['QwQ-32B'],
        defaultModel: 'QwQ-32B'
    }
};

module.exports = {
    aiModels,
    activeModel: 'openai', // Default model
    apiKeys: {
        openai: process.env.OPENAI_API_KEY
    }
};