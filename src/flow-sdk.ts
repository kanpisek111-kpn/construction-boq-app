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
        const inputKey = window.prompt(
          'กรุณากรอก Gemini API Key เพื่อใช้งานระบบ AI วิเคราะห์แบบแปลน:\n(สามารถขอ API Key ได้ฟรีจาก Google AI Studio: aistudio.google.com)\n\nหรือกด Cancel เพื่อใช้ตัวอย่างผลวิเคราะห์จำลอง (Demo Mode)'
        );
        if (inputKey && inputKey.trim()) {
          localStorage.setItem('GEMINI_API_KEY', inputKey.trim());
          return Flow.generate.text(prompt, options);
        } else {
          // Return high quality simulated plan analysis result so user can test the app without an API key immediately
          return {
            text: JSON.stringify({
              houseAreaSqm: 135,
              floors: 1,
              structureSystem: "โครงสร้าง คสล. เสาเข็มหกเหลี่ยม 6ม. พร้อมฐานรากเดี่ยวและคานคอดิน",
              roofType: "หลังคาปั้นหยา มุงกระเบื้องลอนคู่ โครงเหล็กกัลวาไนซ์",
              wallType: "ผนังก่ออิฐมวลเบาหนา 7.5 ซม. ฉาบปูนเรียบ 2 ด้าน",
              keyItemsFound: [
                "ห้องนอน 3 ห้อง, ห้องน้ำ 2 ห้อง, โถงรับแขก 1 ห้อง, ห้องครัว 1 ห้อง",
                "ประตูห้อง HDF 80x200 ซม. 3 ชุด, ประตูห้องน้ำ UPVC 70x200 ซม. 2 ชุด",
                "หน้าต่างบานเลื่อนอลูมิเนียมดำ กระจกเขียวตัดแสง 1.20x1.10 ม. 6 ชุด",
                "กระเบื้องแกรนิตโต้ปูพื้น 60x60 ซม. พื้นที่ 115 ตร.ม."
              ],
              boqItems: [
                {
                  id: "ai-item-1",
                  category: "structure",
                  name: "งานโครงสร้างฐานราก เสา คาน คสล. (ถอดจากแปลนบ้าน)",
                  spec: "คอนกรีต 240 ksc + เหล็กข้ออ้อย DB12/RB9 ตามแปลน 135 ตร.ม.",
                  quantity: 135,
                  unit: "ตร.ม.",
                  materialUnitPrice: 1850,
                  laborUnitPrice: 750,
                  wastePercent: 5
                },
                {
                  id: "ai-item-2",
                  category: "roof",
                  name: "งานโครงหลังคาเหล็กกัลวาไนซ์ & มุงกระเบื้องลอนคู่",
                  spec: "พื้นที่ลาดเอียง ~165 ตร.ม. พร้อมเชิงชายและครอบสันหลังคา",
                  quantity: 165,
                  unit: "ตร.ม.",
                  materialUnitPrice: 680,
                  laborUnitPrice: 280,
                  wastePercent: 7
                },
                {
                  id: "ai-item-3",
                  category: "masonry_wall",
                  name: "งานก่อผนังอิฐมวลเบา 7.5 ซม. พร้อมฉาบปูนเรียบ 2 ด้าน",
                  spec: "พื้นที่ผนัง ~236 ตร.ม. พร้อมเสาเอ็นและคานทับหลังรอบวงกบ",
                  quantity: 236,
                  unit: "ตร.ม.",
                  materialUnitPrice: 320,
                  laborUnitPrice: 215,
                  wastePercent: 5
                },
                {
                  id: "ai-item-4",
                  category: "doors_windows",
                  name: "ชุดหน้าต่างบานเลื่อนอลูมิเนียม 2 บาน (ขนาด 1.20 x 1.10 ม.)",
                  spec: "อลูมิเนียมหนา 1.2 มม. สีดำ กระจกเขียวตัดแสง 5 มม. 6 ชุด",
                  quantity: 6,
                  unit: "ชุด",
                  materialUnitPrice: 2450,
                  laborUnitPrice: 400,
                  wastePercent: 0
                },
                {
                  id: "ai-item-5",
                  category: "finishes",
                  name: "งานปูกระเบื้องแกรนิตโต้พื้น 60x60 ซม. ผิวมัน/กึ่งเงา",
                  spec: "สำหรับห้องโถงและห้องนอน พร้อมปูนกาวและกาวยาแนว",
                  quantity: 115,
                  unit: "ตร.ม.",
                  materialUnitPrice: 360,
                  laborUnitPrice: 180,
                  wastePercent: 7
                }
              ]
            })
          };
        }
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
