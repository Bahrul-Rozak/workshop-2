import { getStore } from "@edgeone/pages-blob";

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Baca content file sebagai text
    const content = await file.text();
    
    // Simpan ke Blob Storage
    const store = getStore("memory-makers-cfyznvtdex4f");
    const fileName = `documents/${file.name}`;
    
    await store.set(fileName, content);

    return new Response(JSON.stringify({ 
      success: true, 
      fileName: file.name,
      message: 'File uploaded successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}