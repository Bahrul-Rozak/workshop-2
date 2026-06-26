import { getStore } from "@edgeone/pages-blob";

export async function onRequestGet(context) {
  try {
    const store = getStore("memory-makers-cfyznvtdex4f");
    
    // Ambil chat history dari Blob
    const history = await store.get('chat/history.json');
    
    if (!history) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(history, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const { messages } = await request.json();
    const store = getStore("memory-makers-cfyznvtdex4f");

    // Simpan chat history ke Blob
    await store.set('chat/history.json', JSON.stringify(messages));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}