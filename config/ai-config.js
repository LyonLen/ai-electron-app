const aiModels = {
    openai: {
        name: 'DeepSeek-R1',
        apiBase: 'http://125.71.97.27:9000/v1',
        models: ['DeepSeek-R1-Distill-Qwen-32B'],
        defaultModel: 'DeepSeek-R1-Distill-Qwen-32B'
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