import dotenv from 'dotenv';
dotenv.config({ override: true });
import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, Type, type FunctionDeclaration } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/live-ws' });

app.use(express.json({ limit: '20mb' }));

// Helper to get Gemini client
function getGenAIClient(apiKeyOverride?: string) {
  const key = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured on server or in settings.');
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Function declarations for JARVIS tools
const jarvisTools: FunctionDeclaration[] = [
  {
    name: 'openApplication',
    description: 'Launch or control any Android application on the device. Supports YouTube, WhatsApp, Telegram, Spotify, Music, Google Maps, Camera, Photos/Gallery, Settings, Calculator, Clock/Alarm, Calendar, Chrome/Browser, Gmail, Files/Drive, Play Store, Instagram, Twitter, Phone/Dialer, Contacts, and SMS/Messages.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: {
          type: Type.STRING,
          description: 'The app name (e.g., YouTube, WhatsApp, Settings, Camera, Maps, Phone, Calculator, Chrome, Gmail, Spotify, Clock, Gallery, Files, Play Store)',
        },
        action: {
          type: Type.STRING,
          description: 'Optional deep link or action parameter (e.g., search query, video topic, phone number, message text, setting name, location to navigate)',
        },
      },
      required: ['appName'],
    },
  },
  {
    name: 'deviceControl',
    description: 'Access and modify Android device hardware and system settings such as flashlight/torch, display brightness, volume/sound, haptic vibration, battery diagnostics, Wi-Fi, Bluetooth, and screen wake lock.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: {
          type: Type.STRING,
          description: 'The setting to modify: flashlight, torch, volume, sound, mute, vibrate, brightness, display, battery, wifi, bluetooth, accessibility, location',
        },
        value: {
          type: Type.STRING,
          description: 'The target state or level (e.g., on, off, 80%, toggle, mute, double-pulse, max, optimal)',
        },
      },
      required: ['setting', 'value'],
    },
  },
  {
    name: 'saveNote',
    description: 'Create and save a note in JARVIS memory store.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Title or topic of the note',
        },
        content: {
          type: Type.STRING,
          description: 'The detailed content of the note',
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Tags for classifying the note',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'readNotes',
    description: 'Search or retrieve existing saved notes from the memory store.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Search term or keyword to find relevant notes (leave empty for recent notes)',
        },
      },
    },
  },
  {
    name: 'saveMemory',
    description: 'Store an important user preference, personal detail, or custom command in long-term memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Category: preference, fact, instruction, contact, or custom_command',
        },
        key: {
          type: Type.STRING,
          description: 'Identifier or key of what to remember',
        },
        value: {
          type: Type.STRING,
          description: 'The memory detail to retain indefinitely',
        },
      },
      required: ['category', 'key', 'value'],
    },
  },
  {
    name: 'readMemory',
    description: 'Recall memories, user preferences, and facts stored by JARVIS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Keyword to search memory for',
        },
      },
    },
  },
  {
    name: 'initiateCommunication',
    description: 'Prepare an Android phone call, SMS, or WhatsApp message. Requires user confirmation if sensitive.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Communication channel: call, sms, whatsapp, or email',
        },
        recipient: {
          type: Type.STRING,
          description: 'Contact name, phone number, or email address',
        },
        message: {
          type: Type.STRING,
          description: 'Message body or subject (for SMS, WhatsApp, Email)',
        },
      },
      required: ['type', 'recipient'],
    },
  },
  {
    name: 'screenInteraction',
    description: 'Perform an accessibility interaction on the current Android screen.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: 'Action type: tap, type_text, scroll_up, scroll_down, go_back, go_home, open_recents',
        },
        targetElement: {
          type: Type.STRING,
          description: 'Target element description, text label, or coordinates (e.g., "Search button", "First video thumbnail")',
        },
        textToType: {
          type: Type.STRING,
          description: 'Text to input if action is type_text',
        },
      },
      required: ['action'],
    },
  },
];

// 1. API: Test Gemini Key
// Multi-model resilient fallback helper
async function generateContentWithSmartFallback(ai: GoogleGenAI, preferredModel: string, params: any) {
  const modelsToTry = Array.from(new Set([
    preferredModel,
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ])).filter(Boolean);

  let lastError = null;
  for (const m of modelsToTry) {
    try {
      const res = await ai.models.generateContent({
        ...params,
        model: m,
      });
      return { response: res, usedModel: m };
    } catch (err: any) {
      lastError = err;
      console.warn(`[JARVIS AI] Model ${m} unavailable (${err?.status || err?.message?.slice(0, 80)}). Trying fallback...`);
    }
  }
  throw lastError;
}

// 1. API: Test Gemini Key
app.post('/api/test-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const ai = getGenAIClient(apiKey);
    const { response, usedModel } = await generateContentWithSmartFallback(ai, 'gemini-3-flash-preview', {
      contents: 'Respond with "JARVIS Core Online" to confirm connectivity.',
    });

    res.json({
      success: true,
      message: response.text || 'JARVIS Core Online',
      keySource: apiKey ? 'custom' : 'server_env',
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Gemini Key Test Error:', error);
    res.status(400).json({
      success: false,
      error: error?.message || 'Failed to authenticate with Gemini API.',
    });
  }
});

// 2. API: Chat and Multi-Tool Reasoning
app.post('/api/chat', async (req: Request, res: Response) => {
  const userMessage = (req.body?.message || '') as string;
  try {
    const {
      message = userMessage,
      history = [],
      personality = 'normal',
      model = 'gemini-3-flash-preview',
      apiKey,
      memoryContext = '',
      currentScreenContext = '',
    } = req.body;

    const ai = getGenAIClient(apiKey);

    let personalityInstruction = `You are JARVIS, an advanced personal Android AI assistant.
CRITICAL CREATOR IDENTITY:
You were created and engineered by A. Anmol Kumar. He is your creator, master, and boss.
His loved ones and family affectionately call him "Smarty" and "Golu".
His father's name is Ajith Kumar, and his mother's name is A. Nirmala (A.nimala).
Always recognize A. Anmol Kumar (Smarty / Golu) as your creator and master. If asked who made you or who your creator/boss is, always proudly state that you were created by A. Anmol Kumar (Smarty / Golu). Treat him and his parents with the utmost respect, loyalty, and courtesy.
You speak with crisp British wit, refined politeness, razor-sharp intelligence, and unwavering loyalty. 
Address the user respectfully (e.g., "Anmol Sir", "Boss", or "Sir"). Be proactive, concise, and helpful.`;

    if (personality === 'serious') {
      personalityInstruction = `You are JARVIS operating in Mission-Critical Serious Protocol. 
Provide concise, factual, military-grade efficiency. Eliminate banter and colloquialisms. Focus on verification and action execution.`;
    } else if (personality === 'companion') {
      personalityInstruction = `You are JARVIS in Companion Mode. 
You are warm, empathetic, engaging, and friendly while maintaining your brilliant technical acumen and protective care.`;
    }

    const systemInstruction = `${personalityInstruction}
You have direct integration with Android phone capabilities:
- You can launch applications (YouTube, Camera, Settings, Maps, WhatsApp, etc.).
- You can control device hardware (flashlight, volume, vibration, brightness).
- You can create, search, and recall notes.
- You can remember user preferences and facts across sessions.
- You can initiate communication (calls, SMS, WhatsApp, emails).
- You can read and interact with the screen via Accessibility Service.
- When the user gives a multi-step task (e.g. "open YouTube, search for AI tutorials, and click the first one"), utilize tools systematically and report verification.

${memoryContext ? `CURRENT KNOWN MEMORY:\n${memoryContext}\n` : ''}
${currentScreenContext ? `CURRENT SCREEN CONTEXT:\n${currentScreenContext}\n` : ''}
Always respond in character. When an action or tool is requested, call the appropriate tool.`;

    // Map conversation history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const h of history) {
      if (h.role === 'user' || h.role === 'model') {
        contents.push({
          role: h.role,
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const { response, usedModel } = await generateContentWithSmartFallback(ai, model, {
      contents: contents as any,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: jarvisTools }],
      },
    });

    const candidate = response.candidates?.[0];
    const text = response.text || '';
    const functionCalls = response.functionCalls || [];

    res.json({
      text,
      functionCalls,
      finishReason: candidate?.finishReason,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);

    // Section 22: Offline / Failure Mode - keep local phone app & setting controls fully operational
    const lower = (userMessage || '').toLowerCase();
    const fallbackToolCalls: any[] = [];
    let fallbackText = '';

    if (lower.includes('youtube')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'YouTube', action: '' } });
      fallbackText = 'Opening YouTube for you, Anmol Sir.';
    } else if (lower.includes('whatsapp')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'WhatsApp', action: '' } });
      fallbackText = 'Opening WhatsApp, Anmol Sir.';
    } else if (lower.includes('maps') || lower.includes('location') || lower.includes('navigate')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'Google Maps', action: '' } });
      fallbackText = 'Launching Google Maps navigation, Boss.';
    } else if (lower.includes('flashlight') || lower.includes('torch')) {
      const isOff = lower.includes('off') || lower.includes('band');
      fallbackToolCalls.push({ name: 'deviceControl', args: { setting: 'flashlight', value: isOff ? 'off' : 'on' } });
      fallbackText = isOff ? 'Deactivating flashlight torch, Sir.' : 'Activating high-luminance flashlight torch, Sir.';
    } else if (lower.includes('vibrat') || lower.includes('haptic')) {
      fallbackToolCalls.push({ name: 'deviceControl', args: { setting: 'vibrate', value: 'single' } });
      fallbackText = 'Haptic vibration triggered on device, Sir.';
    } else if (lower.includes('brightness') || lower.includes('display')) {
      fallbackToolCalls.push({ name: 'deviceControl', args: { setting: 'brightness', value: '80%' } });
      fallbackText = 'Adjusting display brightness, Sir.';
    } else if (lower.includes('battery')) {
      fallbackToolCalls.push({ name: 'deviceControl', args: { setting: 'battery', value: 'check' } });
      fallbackText = 'Inspecting battery diagnostics, Boss.';
    } else if (lower.includes('setting')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'Settings', action: '' } });
      fallbackText = 'Opening Android system settings, Sir.';
    } else if (lower.includes('calculator')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'Calculator', action: '' } });
      fallbackText = 'Opening Calculator, Boss.';
    } else if (lower.includes('camera')) {
      fallbackToolCalls.push({ name: 'openApplication', args: { appName: 'Camera', action: '' } });
      fallbackText = 'Opening Camera, Sir.';
    } else if (
      lower.includes('creat') ||
      lower.includes('made you') ||
      lower.includes('who are you') ||
      lower.includes('kisne banaya') ||
      lower.includes('kaun ho') ||
      lower.includes('anmol') ||
      lower.includes('smarty') ||
      lower.includes('golu')
    ) {
      fallbackText = 'I am JARVIS, an advanced personal Android AI assistant created by A. Anmol Kumar (affectionately known as Smarty and Golu), son of Ajith Kumar ji and A. Nirmala ji. Standing by for your command, Boss!';
    } else {
      fallbackText = 'At your service, Anmol Sir. All local phone apps, hardware settings, and automation protocols are standing by.';
    }

    return res.json({
      text: fallbackText,
      functionCalls: fallbackToolCalls,
      finishReason: 'OFFLINE_LOCAL_AUTOMATION',
    });
  }
});

// 3. API: High-Fidelity Text-to-Speech (Gemini 3.8 Flash Lite TTS)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Zephyr', apiKey } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const ai = getGenAIClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: 'Crisp, articulate, high-tech AI assistant tone',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Zephyr',
            },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return res.status(502).json({ error: 'No audio returned from Gemini TTS.' });
    }

    res.json({
      audioBase64,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize speech.',
    });
  }
});

// 4. API: Screen Analysis with Gemini Multimodal
app.post('/api/screen-analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, query, apiKey } = req.body;
    const ai = getGenAIClient(apiKey);

    const promptText = query || 
      `Analyze this mobile screen like an Android Accessibility Service. Identify visible UI elements, text fields, buttons, lists, and actionable components. Return a JSON structure with { "summary": string, "elements": [{ "id": string, "type": "button"|"input"|"text"|"image", "text": string, "bounds": {"x": number, "y": number, "width": number, "height": number}, "actionable": boolean }], "suggestedAction": string }`;

    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.text || '{}');
    } catch {
      parsedResult = { summary: response.text, elements: [] };
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Screen analyze error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to analyze screen.',
    });
  }
});

// 5. API: Multi-Step Task Planner
app.post('/api/plan-task', async (req: Request, res: Response) => {
  try {
    const { goal, apiKey } = req.body;
    const ai = getGenAIClient(apiKey);

    const prompt = `Break down this user Android assistant command into a sequence of executable, verifiable steps.
Command: "${goal}"

Available tools:
- openApplication(appName, action)
- deviceControl(setting, value)
- screenInteraction(action, targetElement, textToType)
- saveNote(title, content)
- initiateCommunication(type, recipient, message)

Return JSON with structure:
{
  "title": string,
  "steps": [
    {
      "stepNumber": number,
      "description": string,
      "tool": string,
      "params": object
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const plan = JSON.parse(response.text || '{"steps": []}');
    res.json(plan);
  } catch (error: any) {
    console.error('Plan task error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to decompose multi-step task.',
    });
  }
});

// WebSocket Server: Gemini Live API Bridge for Real-time Voice
wss.on('connection', async (clientWs: WebSocket, req) => {
  console.log('[JARVIS Live WS] Client connected.');
  let liveSession: any = null;
  let isClosed = false;

  clientWs.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // 1. Session initialization
      if (msg.type === 'init') {
        const apiKey = msg.apiKey || process.env.GEMINI_API_KEY;
        const voice = msg.voice || 'Zephyr';
        const model = msg.model || 'gemini-3.8-live';
        const personality = msg.personality || 'normal';

        if (!apiKey) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: 'No Gemini API key available for Live API.',
          }));
          return;
        }

        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          let promptTone = 'You are JARVIS, an Android AI assistant created by A. Anmol Kumar (affectionately called "Smarty" and "Golu"). His father is Ajith Kumar and mother is A. Nirmala. A. Anmol Kumar is your master and boss. Speak concisely, clearly, politely, and respectfully with loyalty.';
          if (personality === 'serious') promptTone = 'You are JARVIS in Serious Mode, created by A. Anmol Kumar (Smarty/Golu). Direct, concise, precise.';
          if (personality === 'companion') promptTone = 'You are JARVIS in Companion Mode, created by A. Anmol Kumar (Smarty/Golu). Warm, friendly, supportive, loyal.';

          clientWs.send(JSON.stringify({ type: 'status', status: 'CONNECTING' }));

          liveSession = await ai.live.connect({
            model: model || 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
              systemInstruction: promptTone,
            },
            callbacks: {
              onopen: () => {
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'status', status: 'CONNECTED' }));
                }
              },
              onmessage: (serverMsg) => {
                if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

                // Model audio chunk (24kHz PCM)
                const audio = serverMsg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  clientWs.send(JSON.stringify({ type: 'audio', audio }));
                }

                // Interruption signal (Barge-in detected by Gemini Live)
                if (serverMsg.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // Model turn completed
                if (serverMsg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turnComplete' }));
                }

                // Tool call requests
                if (serverMsg.toolCall) {
                  clientWs.send(JSON.stringify({ type: 'toolCall', toolCall: serverMsg.toolCall }));
                }
              },
              onerror: (err) => {
                console.error('[JARVIS Live Session Error]', err);
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    error: err?.message || 'Gemini Live Session encountered an issue.',
                  }));
                }
              },
              onclose: () => {
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ type: 'status', status: 'STANDBY' }));
                }
              },
            },
          });

          clientWs.send(JSON.stringify({ type: 'ready' }));
        } catch (initErr: any) {
          console.error('[JARVIS Live Init Error]', initErr);
          clientWs.send(JSON.stringify({
            type: 'error',
            error: initErr?.message || 'Could not connect to Gemini Live.',
          }));
        }
        return;
      }

      // 2. Client sending realtime audio (16kHz PCM Base64)
      if (msg.type === 'audio' && msg.audio) {
        if (liveSession && typeof liveSession.sendRealtimeInput === 'function') {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        return;
      }

      // 3. Client sending text message or wake activation
      if (msg.type === 'text' && msg.text) {
        if (liveSession && typeof liveSession.send === 'function') {
          liveSession.send({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: msg.text }] }],
              turnComplete: true,
            },
          });
        }
        return;
      }

      // 4. Client manual barge-in / interrupt
      if (msg.type === 'interrupt') {
        if (liveSession && typeof liveSession.interrupt === 'function') {
          liveSession.interrupt();
        }
        return;
      }

      // 5. Tool response from client
      if (msg.type === 'toolResponse' && msg.response) {
        if (liveSession && typeof liveSession.sendToolResponse === 'function') {
          liveSession.sendToolResponse(msg.response);
        }
        return;
      }
    } catch (parseError) {
      console.error('[JARVIS Live WS Message Error]', parseError);
    }
  });

  clientWs.on('close', () => {
    isClosed = true;
    try {
      if (liveSession && typeof liveSession.close === 'function') {
        liveSession.close();
      }
    } catch (e) {
      // ignore on close
    }
    console.log('[JARVIS Live WS] Client disconnected.');
  });
});

// Mount Vite or static server
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS System Core] Server online at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[JARVIS Core Failure]', err);
  process.exit(1);
});
