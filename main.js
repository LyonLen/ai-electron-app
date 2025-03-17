require('dotenv').config();
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs').promises;
const aiService = require('./services/ai-service');
const { get } = require('http');
const { title } = require('process');

let mainWindow;
let sessions = new Map(); // Store chat sessions

// Add path for sessions storage
const sessionsPath = path.join(app.getPath('userData'), 'sessions');

// Ensure sessions directory exists
async function initSessionsDirectory() {
    try {
        await fs.mkdir(sessionsPath, { recursive: true });
    } catch (error) {
        console.error('Error creating sessions directory:', error);
    }
}

// Load sessions from disk
async function loadSessions() {
    try {
        const files = await fs.readdir(sessionsPath);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const sessionId = file.replace('.json', '');
                const data = await fs.readFile(path.join(sessionsPath, file), 'utf8');
                const sessionData = JSON.parse(data);
                sessions.set(sessionId, sessionData || newSessionData());
            }
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Save session to disk
async function saveSession(sessionId, sessionData) {
    try {
        const filePath = path.join(sessionsPath, `${sessionId}.json`);
        await fs.writeFile(filePath, JSON.stringify(sessionData), 'utf8');
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // This is important for custom titlebar
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    mainWindow.loadFile('index.html');

    // Add window state handlers
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-change', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-change', false);
    });
}

// Initialize app
app.whenReady().then(async () => {
    await initSessionsDirectory();
    await loadSessions();
    createWindow();

    // 添加快捷键
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        mainWindow.webContents.toggleDevTools();
    });
})

// Handle window controls
ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
    // Notify renderer about window state change
    mainWindow.webContents.send('window-state-change', mainWindow.isMaximized());
});

ipcMain.on('close-window', () => {
    mainWindow.close();
});

// 在其他 IPC handlers 附近添加
ipcMain.on('toggle-maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }

    // Notify renderer about window state change
    mainWindow.webContents.send('window-state-change', mainWindow.isMaximized());
});

// Add this to your existing ipcMain handlers
ipcMain.handle('is-maximized', () => {
    return mainWindow.isMaximized();
});

function newSessionData() {
    return { messages: [], lastEditTime: Date.now() };
}

// Update IPC handlers
ipcMain.handle('create-session', async (event, sessionId) => {
    if (!sessions.has(sessionId)) {
        const newData = newSessionData()
        sessions.set(sessionId, newData);
        await saveSession(sessionId, newData);
    }
    return sessionId;
});

ipcMain.handle('get-session-data', async (event, sessionId) => {
    try {
        const filePath = path.join(sessionsPath, `${sessionId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading session data:', error);
        return { messages: [], lastEditTime: 0 };
    }
});

ipcMain.handle('get-session-messages', async (event, sessionId) => {
    const messages = sessions.get(sessionId).messages || [];
    return messages;
});

ipcMain.handle('get-session-lastedittime', async (event, sessionId) => {
    return sessions.get(sessionId).lastEditTime || 0;
});

ipcMain.handle('save-message', async (event, { sessionId, message, isUser, thinkContent }) => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, newSessionData());
    }
    const sessionData = sessions.get(sessionId)
    const messages = sessionData.messages;
    messages.push({ message, isUser, timestamp: Date.now() });
    await saveSession(sessionId, { messages: messages, lastEditTime: Date.now(), title: sessionData.title });
    return messages;
});

// Get all sessions
ipcMain.handle('get-all-sessions', async () => {
    return Array.from(sessions.keys());
});

ipcMain.handle('delete-session', async (event, sessionId) => {
    try {
        // Remove from memory
        sessions.delete(sessionId);

        // Remove file from disk
        const filePath = path.join(sessionsPath, `${sessionId}.json`);
        await fs.unlink(filePath);

        return true;
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
});

// Add new IPC handler for AI messages
ipcMain.handle('send-ai-message', async (event, { message, sessionId }) => {
    try {
        const messages = sessions.get(sessionId).messages || [];


        // 创建一个新的 Promise 来处理流式响应
        await new Promise((resolve, reject) => {
            // 确保移除所有之前的监听器
            aiService.removeAllListeners();

            // 设置新的监听器
            const contentHandler = ({ content }) => {
                if (content) {
                    event.sender.send('ai-stream', content);
                }
            };

            const reasoningHandler = ({ content }) => {
                if (content) {
                    event.sender.send('ai-reason-stream', content);
                }
            };

            const completeHandler = () => {
                resolve();
            };

            const errorHandler = (error) => {
                console.error('Stream error:', error);
                reject(error);
            };

            // 使用 once 而不是 on 来防止重复监听
            aiService.once('complete', completeHandler);
            aiService.once('error', errorHandler);
            // content 事件可能会多次触发，所以使用 on
            aiService.on('content', contentHandler);
            // content 事件可能会多次触发，所以使用 on
            aiService.on('reasoning', reasoningHandler);

            // 开始发送消息
            aiService.sendMessage(message, messages).catch(reject);
        });

        return 'Message sent successfully';
    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    } finally {
        // 确保清理所有监听器
        aiService.removeAllListeners();
    }
});

// 添加更新会话标题的处理器
ipcMain.handle('update-session-title', async (event, sessionId, title) => {
    const sessionData = sessions.get(sessionId);
    sessionData.title = title;
    sessionData.lastEditTime = Date.now();
    sessions.set(sessionId, sessionData);
    await saveSession(sessionId, sessionData);
    return true;
});

ipcMain.handle('get-session-title', async (event, sessionId) => {
    if (sessions.has(sessionId)) {
        return sessions.get(sessionId).title || '';
    }
    return '';
});

ipcMain.handle('get-ai-title', async (event, currentSessionId) => {
    const filePath = path.join(sessionsPath, `${currentSessionId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const sessionData = JSON.parse(data);
    return await Promise.resolve(aiService.getTitle(sessionData.messages));
});