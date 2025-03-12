const { aiModels, activeModel, apiKeys } = require('../config/ai-config');
const { EventEmitter } = require('events');
const fetch = require('node-fetch');

class AIService extends EventEmitter {
    constructor() {
        super();
        this.configs = aiModels;
        this.pendingResponse = null;
    }

    async sendMessage(message, context = []) {
        try {
            const config = this.configs[activeModel];
            const messages = [
                ...context.map(msg => ({
                    role: msg.isUser ? 'user' : 'assistant',
                    content: msg.message
                })),
                { role: 'user', content: message }
            ];

            const response = await fetch(`${config.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.defaultModel,
                    messages,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const stream = response.body;
            const decoder = new TextDecoder();
            let buffer = '';
            let startThinking = false;
            let endThinking = false;

            return new Promise((resolve, reject) => {
                stream.on('data', chunk => {
                    buffer += decoder.decode(chunk, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content || '';
                                const reasoning = json.choices[0]?.delta?.reasoning_content || '';

                                if (reasoning) {
                                    if (!startThinking) {
                                        this.emit('content', { content: '<think>' });
                                        startThinking = true;
                                    }
                                    this.emit('content', { content: reasoning });
                                } else {
                                    if (startThinking && !endThinking) {
                                        this.emit('content', { content: '</think>' });
                                        endThinking = true;
                                    }
                                    this.emit('content', { content });
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
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
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async* sendToAnthropic(message, context) {
        const messages = context.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.message
        }));

        const stream = await this.clients.anthropic.messages.create({
            model: aiModels.anthropic.defaultModel,
            messages: [...messages, { role: 'user', content: message }],
            stream: true
        });

        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.content[0]?.text || '';
            fullResponse += content;
            yield { content, fullResponse };
        }
    }
}

module.exports = new AIService();