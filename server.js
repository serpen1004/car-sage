const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error('API_KEY environment variable is not set');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ANALYTICS_FILE = 'analytics_data.json';
const CAR_DATA_FILE = 'carData.json';
const DB_FILE = 'chat_history.db';

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const carImages = {
    'engine': '/images/engine.jpg',
    'transmission': '/images/transmission.jpg',
    'brake': '/images/brake.jpg',
    'suspension': '/images/suspension.jpg',
    'steering': '/images/steering.jpg',
};

let carData = [];
let analyticsData = [];
let db;

async function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                reject(err);
            } else {
                db.run(`CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_input TEXT,
          ai_response TEXT
        )`, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}

const conversationContexts = new Map();

async function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        reject(err);
      } else {
        db.run(`CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_input TEXT,
          ai_response TEXT
        )`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

async function loadData() {
    try {
        const carDataRaw = await fs.readFile(CAR_DATA_FILE, 'utf8');
        carData = JSON.parse(carDataRaw);

        const analyticsDataRaw = await fs.readFile(ANALYTICS_FILE, 'utf8');
        analyticsData = JSON.parse(analyticsDataRaw);
    } catch (error) {
        console.error('Error loading data:', error.message);
        if (!carData.length) {
            console.error('Failed to load car data. Exiting.');
            process.exit(1);
        }
        if (!analyticsData.length) {
            console.log('No existing analytics file found. Starting with empty data.');
        }
    }
}

async function saveAnalyticsData() {
    try {
        await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analyticsData, null, 2));
    } catch (error) {
        console.error('Error saving analytics data:', error.message);
    }
}

function logAnalyticsEvent(eventName, eventProperties) {
    const event = {
        timestamp: new Date().toISOString(),
        eventName,
        eventProperties
    };
    analyticsData.push(event);
    saveAnalyticsData();
    console.log('Analytics event logged:', event);
}

function saveChatHistory(userInput, aiResponse) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO chat_history (user_input, ai_response) VALUES (?, ?)', [userInput, aiResponse], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

app.post('/chat', async (req, res) => {
    try {
        const { input, conversationId } = req.body;
        let context = conversationContexts.get(conversationId) || [];

        context.push({ role: 'user', content: input });

        const carSpecificPrompt = `You are an AI assistant specialized in all aspects of cars, including makes, models, technical specifications, maintenance, history, and current trends. Please provide information about cars in response to the following query, taking into account the conversation context. If your response involves explaining a specific car part, please mention the part name clearly so that an appropriate image can be displayed. Use the following additional information about cars to enhance your response: ${JSON.stringify(carData)}
      
      Conversation context:
      ${context.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
      
      Current query: ${input}`;

        const result = await model.generateContent(carSpecificPrompt);
        const response = result.response.text();

        context.push({ role: 'assistant', content: response });
        conversationContexts.set(conversationId, context);

        const imageSuggestions = Object.keys(carImages).filter(part =>
            response.toLowerCase().includes(part.toLowerCase())
        );

        await saveChatHistory(conversationId, input, response);
        logAnalyticsEvent('chat_interaction', { input: input, responseLength: response.length, imagesShown: imageSuggestions.length });

        res.json({
            response: response,
            images: imageSuggestions.map(part => carImages[part]),
            conversationId: conversationId
        });
    } catch (error) {
        console.error('Error in chat:', error);
        logAnalyticsEvent('chat_error', { error: error.message });
        res.status(500).json({ response: 'Sorry, something went wrong.' });
    }
});

async function saveChatHistory(conversationId, userInput, aiResponse) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO chat_history (conversation_id, user_input, ai_response) VALUES (?, ?, ?)',
            [conversationId, userInput, aiResponse],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

app.get('/chat-history', (req, res) => {
    db.all('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50', (err, rows) => {
        if (err) {
            console.error('Error fetching chat history:', err);
            res.status(500).json({ error: 'Failed to fetch chat history' });
        } else {
            res.json(rows);
        }
    });
});

app.get('/chat-history', (req, res) => {
    db.all('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 50', (err, rows) => {
        if (err) {
            console.error('Error fetching chat history:', err);
            res.status(500).json({ error: 'Failed to fetch chat history' });
        } else {
            res.json(rows);
        }
    });
});

app.post('/find-dealers', (req, res) => {
    const { city, state, country } = req.body;
    const mockDealers = [
        {
            name: "City Motors",
            address: "123 Main St, " + city + ", " + state + ", " + country,
            phone: "+1 (555) 123-4567",
            website: "https://www.citymotors.com"
        },
        {
            name: "AutoWorld",
            address: "456 Oak Ave, " + city + ", " + state + ", " + country,
            phone: "+1 (555) 987-6543",
            website: "https://www.autoworld.com"
        },
        {
            name: "Car Paradise",
            address: "789 Pine Rd, " + city + ", " + state + ", " + country,
            phone: "+1 (555) 246-8135",
            website: "https://www.carparadise.com"
        }
    ];

    res.json(mockDealers);
});

async function startServer() {
    try {
        await initDatabase();
        await loadData();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();