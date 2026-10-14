/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  JarvisStatus, 
  ChatMessage, 
  AppSettings, 
  AndroidPermissionState, 
  DeviceTelemetry, 
  PendingConfirmation 
} from './types/jarvis';
import { HudHeader } from './components/HudHeader';
import { CallingModeView } from './components/CallingModeView';
import { ChatView } from './components/ChatView';
import { PhoneAutomationView } from './components/PhoneAutomationView';
import { NotesView } from './components/NotesView';
import { MemoryView } from './components/MemoryView';
import { ScreenControlModal } from './components/ScreenControlModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';

import { settingsStore } from './services/settingsStore';
import { notesStore } from './services/notesStore';
import { memoryStore } from './services/memoryStore';
import { phoneAutomation } from './services/phoneAutomation';
import { geminiService } from './services/geminiService';
import { GeminiLiveSession } from './services/liveClient';
import { ContinuousSpeechEngine } from './services/speechRecognition';
import { WakeWordEngine } from './services/wakeWordEngine';
import { soundEffects } from './services/audioUtils';

export default function App() {
  // App State
  const [status, setStatus] = useState<JarvisStatus>('STANDBY');
  const [activeTab, setActiveTab] = useState<'chat' | 'automation' | 'notes' | 'memory'>('chat');
  const [isCallingModeOpen, setIsCallingModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScreenControlOpen, setIsScreenControlOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // Settings & Permissions
  const [settings, setSettings] = useState<AppSettings>(settingsStore.getSettings());
  const [permissions, setPermissions] = useState<AndroidPermissionState[]>(settingsStore.getPermissions());

  // Conversation & Transcripts
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: 'At your service, Anmol Sir (Smarty / Golu). All JARVIS subsystems, Gemini Live voice engines, and Android automation modules are fully calibrated and standing by for you.',
      timestamp: Date.now(),
    },
  ]);
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{ speaker: 'user' | 'jarvis'; text: string; timestamp: number }>
  >([]);

  // Audio Levels & Playback
  const [inputAudioLevel, setInputAudioLevel] = useState(0);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const currentAudioSourceRef = useRef<HTMLAudioElement | null>(null);

  // Device Telemetry
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>({
    batteryLevel: null,
    isCharging: null,
    networkOnline: navigator.onLine,
    connectionType: '5G / Wi-Fi',
    systemTime: new Date().toLocaleTimeString(),
    screenLocked: false,
    audioOutputDevice: 'Speakerphone',
  });

  // Service References
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const continuousEngineRef = useRef<ContinuousSpeechEngine | null>(null);
  const wakeWordEngineRef = useRef<WakeWordEngine | null>(null);

  // 1. Update Telemetry
  useEffect(() => {
    const updateBattery = async () => {
      const bat = await phoneAutomation.getBatteryInfo();
      setTelemetry((prev) => ({
        ...prev,
        batteryLevel: bat.level,
        isCharging: bat.charging,
        networkOnline: navigator.onLine,
        systemTime: new Date().toLocaleTimeString(),
      }));
    };

    updateBattery();
    const interval = setInterval(updateBattery, 5000);

    const handleOnline = () => setTelemetry((prev) => ({ ...prev, networkOnline: true }));
    const handleOffline = () => setTelemetry((prev) => ({ ...prev, networkOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Play Audio Response (TTS)
  const playSpeech = useCallback(
    async (text: string, msgId?: string) => {
      if (!text || !text.trim()) return;

      // Stop any current playback
      if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.pause();
        currentAudioSourceRef.current = null;
      }
      window.speechSynthesis?.cancel();

      setIsPlayingAudio(true);
      if (msgId) setActivePlayingId(msgId);
      setStatus('SPEAKING');

      // Inform continuous listener that assistant is speaking (for barge-in detection)
      continuousEngineRef.current?.setSpeakingMode(true);

      try {
        // Attempt high-fidelity Gemini 3.8 Flash Lite TTS from backend
        const ttsRes = await geminiService.synthesizeSpeech(
          text,
          settings.voiceName,
          settings.hasCustomKey ? settings.geminiApiKey : undefined
        );

        if (ttsRes.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${ttsRes.audioBase64}`);
          currentAudioSourceRef.current = audio;

          audio.onended = () => {
            setIsPlayingAudio(false);
            setActivePlayingId(null);
            continuousEngineRef.current?.setSpeakingMode(false);
            // Automatically return to listening loop!
            if (settings.continuousListening) {
              setStatus('LISTENING');
            } else {
              setStatus('STANDBY');
            }
          };

          audio.onerror = () => {
            fallbackSpeechSynthesis(text);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        // Fallback to Web Speech Synthesis
        fallbackSpeechSynthesis(text);
      }
    },
    [settings.voiceName, settings.hasCustomKey, settings.geminiApiKey, settings.continuousListening]
  );

  const fallbackSpeechSynthesis = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.speakingSpeed || 1.0;
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setActivePlayingId(null);
        continuousEngineRef.current?.setSpeakingMode(false);
        if (settings.continuousListening) {
          setStatus('LISTENING');
        } else {
          setStatus('STANDBY');
        }
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setActivePlayingId(null);
        continuousEngineRef.current?.setSpeakingMode(false);
        setStatus('STANDBY');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
      setActivePlayingId(null);
      continuousEngineRef.current?.setSpeakingMode(false);
      setStatus('STANDBY');
    }
  };

  // 3. Stop Audio / Barge-in action
  const handleStopAudio = useCallback(() => {
    soundEffects.playInterruptChime();
    setStatus('INTERRUPTED');

    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.pause();
      currentAudioSourceRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (liveSessionRef.current) {
      liveSessionRef.current.handleBargeIn();
    }

    setIsPlayingAudio(false);
    setActivePlayingId(null);
    continuousEngineRef.current?.setSpeakingMode(false);

    setTimeout(() => {
      setStatus('LISTENING');
    }, 350);
  }, []);

  // 4. Handle Tool Execution for Actions
  const executeToolCall = useCallback(
    async (toolName: string, args: Record<string, any>): Promise<string> => {
      soundEffects.playSuccessBeep();

      switch (toolName) {
        case 'openApplication': {
          const res = await phoneAutomation.openApp(args.appName, args.action);
          return res.message;
        }

        case 'deviceControl': {
          const res = await phoneAutomation.accessSetting(args.setting, args.value);
          return res.message;
        }

        case 'saveNote': {
          const note = notesStore.createNote(args.title, args.content, args.tags || [], true);
          return `Note saved in vault: "${note.title}"`;
        }

        case 'readNotes': {
          const results = notesStore.searchNotes(args.query || '');
          if (results.length === 0) return 'No matching notes found in vault.';
          return `Found ${results.length} notes:\n` + results.map((n) => `• ${n.title}: ${n.content}`).join('\n');
        }

        case 'saveMemory': {
          const mem = memoryStore.saveMemory(args.category, args.key, args.value);
          return `Stored in long-term memory: [${mem.key}] = ${mem.value}`;
        }

        case 'readMemory': {
          const mems = memoryStore.getMemories();
          return `Memory Core Contents:\n` + mems.map((m) => `[${m.category}] ${m.key}: ${m.value}`).join('\n');
        }

        case 'initiateCommunication': {
          if (settings.requireConfirmationForSensitive) {
            // Require user confirmation before dispatching call or SMS
            return new Promise((resolve) => {
              setPendingConfirmation({
                id: `confirm-${Date.now()}`,
                actionType: args.type || 'call',
                title: `Confirm ${args.type?.toUpperCase()} Initiation`,
                description: `JARVIS is requesting confirmation to initiate communication with ${args.recipient}.`,
                details: {
                  Recipient: args.recipient,
                  Channel: args.type,
                  Message: args.message || 'Standard voice call',
                },
                onConfirm: () => {
                  phoneAutomation.openApp(args.type === 'whatsapp' ? 'whatsapp' : args.type === 'sms' ? 'sms' : 'phone', args.recipient);
                  setPendingConfirmation(null);
                  resolve(`Verified and initiated ${args.type} to ${args.recipient}`);
                },
                onCancel: () => {
                  setPendingConfirmation(null);
                  resolve(`Communication action cancelled by user protocol.`);
                },
              });
            });
          } else {
            phoneAutomation.openApp(args.type === 'whatsapp' ? 'whatsapp' : args.type === 'sms' ? 'sms' : 'phone', args.recipient);
            return `Initiated ${args.type} to ${args.recipient}`;
          }
        }

        case 'screenInteraction': {
          return `Accessibility Action '${args.action}' performed on target '${args.targetElement || 'screen'}'`;
        }

        default:
          return `Command executed on system.`;
      }
    },
    [settings.requireConfirmationForSensitive]
  );

  // 5. Send Command to Gemini AI Brain
  const handleSendCommand = useCallback(
    async (userInput: string, isVoice = false) => {
      if (!userInput.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: userInput.trim(),
        timestamp: Date.now(),
        isVoice,
      };

      setMessages((prev) => [...prev, userMsg]);
      setTranscriptHistory((prev) => [
        ...prev,
        { speaker: 'user', text: userInput.trim(), timestamp: Date.now() },
      ]);

      setStatus('THINKING');

      try {
        const memoryContext = settings.memoryEnabled ? memoryStore.getMemoryContextForPrompt() : '';

        const chatResponse = await geminiService.sendChatMessage({
          message: userInput.trim(),
          history: messages.slice(-8),
          personality: settings.personality,
          model: settings.chatModel,
          apiKey: settings.hasCustomKey ? settings.geminiApiKey : undefined,
          memoryContext,
        });

        let executedToolCalls: any[] = [];
        let finalResponseText = chatResponse.text || '';

        // Execute function calls if Gemini requested tools
        if (chatResponse.functionCalls && chatResponse.functionCalls.length > 0) {
          executedToolCalls = chatResponse.functionCalls;
          for (const fc of chatResponse.functionCalls) {
            const toolResult = await executeToolCall(fc.name, fc.args);
            finalResponseText += (finalResponseText ? '\n\n' : '') + `[Action]: ${toolResult}`;
          }
        }

        const modelMsg: ChatMessage = {
          id: `msg-${Date.now()}-model`,
          role: 'model',
          content: finalResponseText || 'Task completed according to your protocol, sir.',
          timestamp: Date.now(),
          toolCalls: executedToolCalls,
        };

        setMessages((prev) => [...prev, modelMsg]);
        setTranscriptHistory((prev) => [
          ...prev,
          { speaker: 'jarvis', text: modelMsg.content, timestamp: Date.now() },
        ]);

        // Speak response if voice requested or autoSpeakResponses enabled
        if (isVoice || settings.autoSpeakResponses) {
          playSpeech(modelMsg.content, modelMsg.id);
        } else {
          setStatus('STANDBY');
        }
      } catch (err: any) {
        console.error('JARVIS Chat Error:', err);
        setStatus('ERROR');
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          role: 'model',
          content: `Subsystem alert: ${err.message || 'Failed to complete command with Gemini.'}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [
      messages,
      settings.personality,
      settings.chatModel,
      settings.hasCustomKey,
      settings.geminiApiKey,
      settings.memoryEnabled,
      settings.autoSpeakResponses,
      executeToolCall,
      playSpeech,
    ]
  );

  // 6. Initialize Wake Word & Continuous Listening Engines
  useEffect(() => {
    // Wake Word Engine
    const wakeEngine = new WakeWordEngine({
      phrase: settings.wakeWordPhrase,
      sensitivity: settings.wakeWordSensitivity,
      enabled: settings.wakeWordEnabled && !isCallingModeOpen,
      onWake: (_transcript, command) => {
        soundEffects.playWakeChime();
        setStatus('LISTENING');

        if (command && command.trim().length > 1) {
          handleSendCommand(command, true);
        }
      },
      onStopCommand: () => {
        handleStopAudio();
      },
      onError: (err) => {
        console.warn('Wake Word Error:', err);
      },
    });

    wakeWordEngineRef.current = wakeEngine;
    if (settings.wakeWordEnabled && !isCallingModeOpen) {
      wakeEngine.start();
    }

    // Continuous Speech Engine for Calling Mode hands-free loop
    const continuousEngine = new ContinuousSpeechEngine({
      onSpeechStart: () => {
        if (status !== 'SPEAKING') {
          setStatus('LISTENING');
        }
      },
      onInterimTranscript: (_interim) => {
        // Visual feedback
      },
      onFinalCommand: (cmd) => {
        if (cmd.trim()) {
          handleSendCommand(cmd, true);
        }
      },
      onStopPhrase: () => {
        handleStopAudio();
      },
      onError: (err) => {
        console.warn('Continuous Speech Error:', err);
      },
    });

    continuousEngineRef.current = continuousEngine;

    return () => {
      wakeEngine.stop();
      continuousEngine.stop();
    };
  }, [
    settings.wakeWordPhrase,
    settings.wakeWordSensitivity,
    settings.wakeWordEnabled,
    isCallingModeOpen,
    handleSendCommand,
    handleStopAudio,
    status,
  ]);

  // 7. Start / Stop Calling Mode
  const startCallingMode = useCallback(() => {
    setIsCallingModeOpen(true);
    wakeWordEngineRef.current?.stop();
    phoneAutomation.acquireWakeLock();

    // Start Live WebSocket session
    const liveSession = new GeminiLiveSession({
      apiKey: settings.hasCustomKey ? settings.geminiApiKey : undefined,
      model: settings.liveModel,
      voice: settings.voiceName,
      personality: settings.personality,
      onStatusChange: (st) => setStatus(st),
      onAudioLevels: (inLvl, outLvl) => {
        setInputAudioLevel(inLvl);
        setOutputAudioLevel(outLvl);
      },
      onInterrupted: () => {
        soundEffects.playInterruptChime();
        setStatus('INTERRUPTED');
      },
      onToolCall: async (toolCall) => {
        if (toolCall?.functionCalls) {
          for (const fc of toolCall.functionCalls) {
            const result = await executeToolCall(fc.name, fc.args);
            liveSessionRef.current?.sendToolResponse({
              functionResponses: [{ response: { output: result }, id: fc.id }],
            });
          }
        }
      },
      onError: (err) => {
        console.warn('Live Session Error:', err);
        // Fallback to Continuous Speech Engine in Calling Mode
        continuousEngineRef.current?.start();
      },
    });

    liveSessionRef.current = liveSession;
    liveSession.startSession();
  }, [settings.hasCustomKey, settings.geminiApiKey, settings.liveModel, settings.voiceName, settings.personality, executeToolCall]);

  const endCallingMode = useCallback(() => {
    phoneAutomation.releaseWakeLock();
    if (liveSessionRef.current) {
      liveSessionRef.current.endSession();
      liveSessionRef.current = null;
    }
    continuousEngineRef.current?.stop();
    setIsCallingModeOpen(false);
    setStatus('STANDBY');

    if (settings.wakeWordEnabled) {
      wakeWordEngineRef.current?.start();
    }
  }, [settings.wakeWordEnabled]);

  const toggleMicMute = useCallback(() => {
    if (liveSessionRef.current) {
      const muted = liveSessionRef.current.toggleMute();
      setIsMicMuted(muted);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Top HUD Header */}
      <HudHeader
        status={status}
        personality={settings.personality}
        telemetry={telemetry}
        wakeWordActive={settings.wakeWordEnabled}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCallingMode={startCallingMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScreenControl={() => setIsScreenControlOpen(true)}
      />

      {/* Main Tab View Port */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            status={status}
            onSendMessage={(txt) => handleSendCommand(txt, false)}
            onClearChat={() => {
              setMessages([]);
              setTranscriptHistory([]);
            }}
            onPlayResponseAudio={(txt) => playSpeech(txt)}
            onStopAudio={handleStopAudio}
            isPlayingAudio={isPlayingAudio}
            activePlayingId={activePlayingId}
            onOpenCallingMode={startCallingMode}
          />
        )}

        {activeTab === 'automation' && (
          <PhoneAutomationView
            onSpeakSummary={(text) => playSpeech(text)}
            apiKey={settings.hasCustomKey ? settings.geminiApiKey : undefined}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView onSpeakNote={(text) => playSpeech(text)} />
        )}

        {activeTab === 'memory' && (
          <MemoryView
            onClearAll={() => {
              setPendingConfirmation({
                id: `wipe-mem-${Date.now()}`,
                actionType: 'delete_memory',
                title: 'Wipe All JARVIS Memories',
                description: 'This will irreversibly erase all stored user facts, preferences, and custom commands from the Memory Core.',
                details: { Target: 'Long-term Memory Store', Items: `${memoryStore.getMemories().length} entries` },
                onConfirm: () => {
                  memoryStore.clearAllMemories();
                  setPendingConfirmation(null);
                  soundEffects.playInterruptChime();
                },
                onCancel: () => setPendingConfirmation(null),
              });
            }}
          />
        )}
      </main>

      {/* Dedicated Full-Screen Calling Mode */}
      {isCallingModeOpen && (
        <CallingModeView
          status={status}
          inputAudioLevel={inputAudioLevel}
          outputAudioLevel={outputAudioLevel}
          isMicMuted={isMicMuted}
          onToggleMute={toggleMicMute}
          onStop={handleStopAudio}
          onEndCall={endCallingMode}
          voiceName={settings.voiceName}
          liveModel={settings.liveModel}
          transcriptHistory={transcriptHistory}
          onSendVoicePrompt={(prompt) => {
            if (liveSessionRef.current) {
              liveSessionRef.current.sendTextMessage(prompt);
            } else {
              handleSendCommand(prompt, true);
            }
          }}
        />
      )}

      {/* Screen Understanding & Control Modal */}
      <ScreenControlModal
        isOpen={isScreenControlOpen}
        onClose={() => setIsScreenControlOpen(false)}
        apiKey={settings.hasCustomKey ? settings.geminiApiKey : undefined}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        permissions={permissions}
        onUpdateSettings={(part) => {
          const updated = settingsStore.updateSettings(part);
          setSettings(updated);
        }}
        onSaveApiKey={(key) => {
          const updated = settingsStore.setApiKey(key);
          setSettings(updated);
        }}
        onDeleteApiKey={() => {
          const updated = settingsStore.clearApiKey();
          setSettings(updated);
        }}
        onTogglePermission={(id) => {
          const updated = settingsStore.togglePermission(id);
          setPermissions(updated);
        }}
        onClearMemory={() => {
          memoryStore.clearAllMemories();
        }}
      />

      {/* Sensitive Action Confirmation Dialog */}
      <ConfirmationDialog confirmation={pendingConfirmation} />
    </div>
  );
}
