import { AIServiceProvider } from './aiInterface.js';
import { GeminiProvider } from './geminiProvider.js';
import { OfflineFallbackProvider } from './offlineFallbackProvider.js';
import { config } from '../../config.js';

let activeProvider: AIServiceProvider | null = null;

export function getAIService(): AIServiceProvider {
  if (!activeProvider) {
    if (config.geminiApiKey && config.geminiApiKey.trim().length > 10) {
      console.log('⚡ Initializing Google Gemini AI Provider (gemini-3.8-flash)');
      activeProvider = new GeminiProvider();
    } else {
      console.log('⚡ Initializing Offline Semantic Fallback NLP Engine (No API key required)');
      activeProvider = new OfflineFallbackProvider();
    }
  }
  return activeProvider;
}

export function setAIService(provider: AIServiceProvider): void {
  activeProvider = provider;
}
