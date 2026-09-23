/**
 * Web Speech API Utilities for AI Study Companion
 * Provides Text-to-Speech (TTS) reading and Speech-to-Text (STT) voice questioning
 * with automatic Markdown cleanup and bilingual (English / Bangla) voice selection.
 */

// Strip markdown formatting for natural vocalization
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown code blocks and inline code
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers
    .replace(/#{1,6}\s+/g, '')
    // Remove latex markers
    .replace(/\$\$[\s\S]*?\$\$/g, 'Mathematical formula.')
    .replace(/\$([^$]+)\$/g, '$1')
    // Remove bold and italics
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points and numbers
    .replace(/^[\s*-+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. TEXT-TO-SPEECH (TTS)
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isSpeaking(): boolean {
  return window.speechSynthesis ? window.speechSynthesis.speaking : false;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export interface SpeakOptions {
  language?: 'en' | 'bn';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  // Stop any currently active speech
  stopSpeaking();

  const spokenText = cleanTextForSpeech(text);
  if (!spokenText) return false;

  const utterance = new SpeechSynthesisUtterance(spokenText);
  currentUtterance = utterance;

  const lang = options.language === 'bn' ? 'bn-BD' : 'en-US';
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to find matching voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const matchedVoice = voices.find(
      (v) => v.lang.startsWith(lang.split('-')[0]) || (options.language === 'bn' && v.lang.includes('bn'))
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  utterance.onstart = () => {
    if (options.onStart) options.onStart();
  };

  utterance.onend = () => {
    currentUtterance = null;
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    currentUtterance = null;
    if (options.onError) options.onError(e);
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

// 2. SPEECH-TO-TEXT (STT) Voice Recognition
export interface SpeechRecognitionOptions {
  language?: 'en' | 'bn';
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function startSpeechRecognition(options: SpeechRecognitionOptions): { stop: () => void } | null {
  if (!isSpeechRecognitionSupported()) {
    if (options.onError) {
      options.onError('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
    }
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = options.language === 'bn' ? 'bn-BD' : 'en-US';

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript.trim()) {
      options.onResult(transcript.trim());
    }
  };

  recognition.onerror = (event: any) => {
    if (options.onError) {
      options.onError(event.error || 'Speech recognition failed.');
    }
  };

  recognition.onend = () => {
    if (options.onEnd) {
      options.onEnd();
    }
  };

  try {
    recognition.start();
  } catch (err: any) {
    if (options.onError) options.onError(err.message || 'Failed to start microphone');
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}
