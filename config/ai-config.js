const aiModels = {
    openai: {
        name: 'QwQ-32B',
        apiBase: 'http://125.71.97.27:8000/QwQ/v1',
        models: ['QwQ-32B'],
        defaultModel: 'QwQ-32B'
    },
    anthropic: {
        name: 'Anthropic Claude',
        apiBase: 'https://api.anthropic.com/v1',
        models: ['claude-3-opus', 'claude-3-sonnet'],
        defaultModel: 'claude-3-sonnet'
    }
};

module.exports = {
    aiModels,
    activeModel: 'openai', // Default model
    apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY
    }
};