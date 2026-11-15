/**
 * Flow SDK Browser Compatibility Layer
 * Provides browser-native implementations for:
 * 1. Flow.download() -> Native HTML5 Blob URL download
 * 2. Flow.media.select() -> Native HTML5 File Picker with camera/gallery support
 * 3. Flow.generate.text() -> Gemini Multimodal API with custom or environment API key
 */

export interface DownloadOptions {
  base64: string;
  mimeType: string;
  filename: string;
}

export interface MediaSelectOptions {
  filter?: string;
}

export interface MediaSelectResult {
  base64: string;
  mimeType: string;
  name: string;
}

export interface GenerateTextOptions {
  images?: Array<{ base64: string; mimeType: string }>;
  systemInstruction?: string;
  thinkingLevel?: string;
}

export interface GenerateTextResult {
  text: string;
}

export const Flow = {
  /**
   * Downloads a base64 encoded file in the browser
   */
  download: async (options: DownloadOptions): Promise<void> => {
    const { base64, mimeType, filename } = options;
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Flow.download failed:', err);
      // Fallback
      window.open(`data:${mimeType};base64,${base64}`, '_blank');
    }
  },

  /**
   * Selects an image or file using standard browser file input (works seamlessly on iOS/Android & Desktop)
   */
  media: {
    select: async (options: MediaSelectOptions = {}): Promise<MediaSelectResult> => {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = options.filter === 'image' ? 'image/*' : '*/*';

        input.onchange = async (event: any) => {
          const file: File = event.target.files?.[0];
          if (!file) {
            reject(new Error('No file selected'));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIndex = result.indexOf(',');
            const base64 = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
            resolve({
              base64,
              mimeType: file.type || 'image/jpeg',
              name: file.name
            });
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        };

        input.oncancel = () => reject(new Error('User cancelled file selection'));
        input.click();
      });
    }
  },

  /**
   * Generates text via Gemini API
   */
  generate: {
    text: async (prompt: string, options: GenerateTextOptions = {}): Promise<GenerateTextResult> => {
      // Check for user-saved Gemini API key in localStorage
      const apiKey = localStorage.getItem('GEMINI_API_KEY') || (import.meta as any).env?.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        // When no API key is configured, throw so PlanAnalyzerModal safely uses its high-fidelity Architectural Vision Engine
        throw new Error('NO_GEMINI_API_KEY');
      }

      // Call Gemini 2.0 / 1.5 API directly
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const contentsParts: any[] = [{ text: prompt }];

      if (options.images && options.images.length > 0) {
        options.images.forEach(img => {
          contentsParts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64
            }
          });
        });
      }

      const body: any = {
        contents: [{ parts: contentsParts }]
      };

      if (options.systemInstruction) {
        body.system_instruction = {
          parts: [{ text: options.systemInstruction }]
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text: generatedText };
    }
  }
};
