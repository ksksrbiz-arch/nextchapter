export interface AIErrorInfo {
  message: string;
  type: 'quota' | 'safety' | 'network' | 'unknown';
  originalError?: any;
}

export function handleAIError(error: any): AIErrorInfo {
  console.error('AI Error:', error);
  
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('quota') || errorMessage.includes('429')) {
    return {
      message: 'We\'ve reached our AI request limit for now. Please wait a moment or try again later.',
      type: 'quota',
      originalError: error
    };
  }
  
  if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
    return {
      message: 'The AI content was blocked due to safety guidelines. Please try a different topic or prompt.',
      type: 'safety',
      originalError: error
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('failed to connect')) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
      type: 'network',
      originalError: error
    };
  }

  return {
    message: errorMessage || 'An unexpected error occurred with the AI assistant. Please try again.',
    type: 'unknown',
    originalError: error
  };
}
