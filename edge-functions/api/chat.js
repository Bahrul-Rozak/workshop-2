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
    
    let contextDocs = '';
    let fileList = [];

    // Cara 1: List semua objects dengan prefix documents/
    try {
      // Gunakan list dengan prefix
      const response = await fetch(`https://api.edgeone.ai/v1/storage/memory-makers-cfyznvtdex4f?prefix=documents/`, {
        headers: {
          'Authorization': `Bearer ${env.MAKERS_MODELS_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        fileList = data.Keys || [];
        
        // Baca setiap file
        for (const key of fileList) {
          try {
            const content = await store.get(key.Key);
            if (content) {
              contextDocs += `\n\n--- DOKUMEN: ${key.Key} ---\n${content}\n`;
            }
          } catch (e) {
            console.error(`Error reading ${key.Key}:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Error listing files:', e);
    }

    // Cara 2: Fallback - coba baca file yang umum
    if (!contextDocs) {
      const commonFiles = [
        'documents/restaurant.txt',
        'documents/daftar_rumah_sakit_bandung.txt',
        'documents/upload.txt',
        'documents/notes.md',
        'documents/info.txt'
      ];

      for (const fileName of commonFiles) {
        try {
          const content = await store.get(fileName);
          if (content) {
            contextDocs += `\n\n--- DOKUMEN: ${fileName} ---\n${content}\n`;
            fileList.push(fileName);
          }
        } catch (e) {
          // File tidak ada, skip
        }
      }
    }

    // 2. Buat system prompt dengan konteks dokumen
    const systemPrompt = `Kamu adalah asisten AI yang membantu dan ramah. 
Tugasmu adalah menjawab pertanyaan user berdasarkan konteks dokumen yang tersedia.

ATURAN MENJAWAB:
1. Jawab HANYA berdasarkan informasi di dokumen yang tersedia
2. Jika informasi ada di dokumen, berikan jawaban yang lengkap dan jelas
3. Jika informasi TIDAK ada di dokumen, katakan dengan jujur "Maaf, saya tidak menemukan informasi tentang [topik] di dokumen yang tersedia"
4. Jangan mengarang atau membuat-buat informasi (no hallucination)
5. Jawab dalam bahasa Indonesia yang santai dan mudah dipahami
6. Jika ada angka, daftar, atau informasi spesifik di dokumen, kutip dengan akurat

KONTEKS DOKUMEN YANG TERSEDIA:
${contextDocs || 'TIDAK ADA DOKUMEN YANG DI-UPLOAD'}

Jumlah dokumen yang dimuat: ${fileList.length} file
Daftar file: ${fileList.join(', ') || 'Tidak ada'}

Sekarang, jawab pertanyaan user berikut:`;

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

    return new Response(JSON.stringify({ 
      reply: text,
      debug: {
        filesFound: fileList.length,
        fileList: fileList,
        contextLength: contextDocs.length
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
    });
  }
}