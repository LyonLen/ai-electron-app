const aiModels = {
    qwq32b: {
        apiBase: 'http://125.71.97.27:8000/QwQ/v1',
        defaultModel: 'QwQ-32B'
    },
    deepseek32b: {
        apiBase: 'http://125.71.97.27:8000/v1',
        defaultModel: 'DeepSeek-R1-Distill-Qwen-32B'
    },
    deepseekr1: {
        apiBase: 'http://10.224.28.80:3000/v1',
        defaultModel: 'deepseek-r1-hs'
    }
};

module.exports = {
    aiModels,
    activeModel: 'qwq32b', // Default model
    apiKeys: {
        qwq32b: process.env.OPENAI_API_KEY,
        deepseek32b: process.env.OPENAI_API_KEY,
        deepseekr1: process.env.ONEAPI_INNER_KEY
    }
};
