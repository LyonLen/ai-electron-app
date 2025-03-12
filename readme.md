# AI Chat Desktop Application

A cross-platform desktop chat application built with Electron that integrates with AI models (Currently supports Claude) for intelligent conversations. Features a modern UI with custom window controls and persistent chat sessions.

## Features

- 🤖 AI-powered conversations using Claude API
- 💭 Real-time streaming of AI responses with thinking indicators
- 📝 Markdown support for code blocks and formatted text
- 💾 Persistent chat sessions with automatic saving
- 🎨 Custom window controls and modern UI
- 📑 Multiple chat session management

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Anthropic API key for Claude

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd ai-electron-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```
ANTHROPIC_API_KEY=your_api_key_here
```

4. Start the application:
```bash
npm start
```

## Development

The application is built with:
- Electron - For cross-platform desktop application
- Claude API - For AI conversation capabilities
- Custom HTML/CSS - For modern UI implementation

Key files:
- `main.js` - Main Electron process
- `index.html` - Application UI
- `services/ai-service.js` - AI integration service

## Project Structure

```
ai-electron-app/
├── main.js
├── index.html
├── services/
│   └── ai-service.js
├── package.json
└── .env
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Electron.js team for the amazing framework
- Anthropic for the Claude AI API
- All contributors who have helped with the project