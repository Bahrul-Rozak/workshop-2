import { createAiGateway } from "@edgeone/makers-models-provider";
import { generateText } from "ai";
import { getStore } from "@edgeone/pages-blob";

export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { messages } = await request.json();

    // 1. Ambil semua dokumen dari Blob Storage
    const store = getStore("memory-makers-cfyznvtdex4f");
    
    // List semua file di folder documents/
    const documentList = [];
    let contextDocs = '';

    // Coba ambil beberapa dokumen umum
    const possibleFiles = [
      'documents/upload.txt',
      'documents/notes.md',
      'documents/info.txt'
    ];

    for (const fileName of possibleFiles) {
      try {
        const content = await store.get(fileName);
        if (content) {
          contextDocs += `\n\n--- Dokumen: ${fileName} ---\n${content}`;
          documentList.push(fileName);
        }
      } catch (e) {
        // File tidak ada, skip
      }
    }

    // 2. Buat system prompt dengan konteks dokumen
    const systemPrompt = `Kamu adalah asisten AI yang membantu. 
Jawab pertanyaan user berdasarkan konteks dokumen berikut ini. 
Jika tidak ada informasi yang relevan di dokumen, bilang saja "Saya tidak menemukan informasi tersebut di dokumen yang tersedia".

KONTEKS DOKUMEN:
${contextDocs || 'Tidak ada dokumen yang di-upload yet.'}

Instruksi:
- Jawab dalam bahasa Indonesia yang santai dan mudah dipahami
- Jika ada informasi di dokumen, kutip atau referensikan
- Jangan mengarang informasi (no hallucination)`;

    // 3. Gabungkan system prompt dengan messages dari user
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // 4. Panggil AI
    const aiGateway = createAiGateway({
      apiKey: env.MAKERS_MODELS_KEY,
    });

    const { text } = await generateText({
      model: aiGateway("@makers/deepseek-v4-flash"),
      messages: fullMessages,
    });

    return new Response(JSON.stringify({ reply: text }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
    });
  }
}