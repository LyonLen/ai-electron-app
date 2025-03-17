const { aiModels, activeModel, apiKeys } = require('../config/ai-config');
const { EventEmitter } = require('events');
const fetch = require('node-fetch');

class AIService extends EventEmitter {
    constructor() {
        super();
        this.configs = aiModels;
        this.pendingResponse = null;
    }

    async getTitle(context) {
        const config = this.configs[activeModel];

        // 只保留用户消息
        context = context.filter(msg => msg.isUser);

        // 如果消息长度小于3，则返回默认标题
        if (context.length < 3) {
            console.debug(`context.length == ${context.length}, return default title`);
            return `Chat ${new Date(Date.now()).toLocaleTimeString()}`
        }

        // 将用户消息拼接成字符串
        let userQuestions = context.map(msg => msg.message).join('\n\n');

        const messages = [
            {
                role: 'system',
                content: `<user-inputs>${userQuestions}</user-inputs>\n\nSummary <user-inputs>, generate title`
            }
        ];

        const response = await fetch(`${config.apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKeys[activeModel]}`
            },
            body: JSON.stringify({
                model: config.defaultModel,
                messages,
                stream: false,
                max_tokens: 500,
                temperature: 0.6
            })
        });
        if (!response.ok) {
            const text = response.statusText;
            throw new Error(`API request failed with status ${response.status} ${text}`);
        }

        const json = await response.json();
        console.debug('response:', json.choices[0]?.message);
        return json.choices[0]?.message?.content || '';
    }

    async sendMessage(message, context = []) {
        const config = this.configs[activeModel];
        if (context) {
            context = context.slice(1);
        }

        // 拼成对话格式，去除html标签
        const messages = [
            { role: 'system', content: 'This is Lyon AI Studio, you are a serious AI assitance.' },
            ...context.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.message.replace(/<[^>]*>/g, '')
            }))
        ];

        const response = await fetch(`${config.apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKeys[activeModel]}`
            },
            body: JSON.stringify({
                model: config.defaultModel,
                messages,
                stream: true,
                temperature: 0.7
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const stream = response.body;
        const decoder = new TextDecoder();
        let buffer = '';

        return new Promise((resolve, reject) => {
            stream.on('data', chunk => {
                buffer += decoder.decode(chunk, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '')
                        continue;
                    if (!line.startsWith('data: '))
                        return;
                    const data = line.slice(6);
                    if (data === '[DONE]')
                        continue;
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content;
                        const reasoning = json.choices[0]?.delta?.reasoning_content;

                        // 把reasoning和content分开
                        if (reasoning || reasoning === '') {
                            this.emit('reasoning', { content: reasoning });
                        } else if (content || content === '') {
                            this.emit('content', { content });
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            });

            stream.on('end', () => {
                this.emit('complete');
                resolve();
            });

            stream.on('error', (error) => {
                this.emit('error', error);
                reject(error);
            });
        });
    }
}

module.exports = new AIService();