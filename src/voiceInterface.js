export class VoiceInterface {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.listening = false;
    this.supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  startListening(onResult, onError) {
    if (!this.supported) { onError?.('Speech recognition not supported in this browser'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-IN';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.listening = false;
      onResult?.(transcript);
    };

    this.recognition.onerror = (event) => {
      this.listening = false;
      onError?.(event.error);
    };

    this.recognition.onend = () => { this.listening = false; };
    this.listening = true;
    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.listening = false;
    }
  }

  speak(text, onDone) {
    if (!this.synthesis) { onDone?.(); return; }
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-IN';
    utterance.onend = () => onDone?.();
    utterance.onerror = () => onDone?.();
    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) this.synthesis.cancel();
  }
}

export const voiceInterface = new VoiceInterface();
