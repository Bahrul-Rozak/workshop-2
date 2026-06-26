export async function onRequestGet(context) {
  return new Response(null, {
    status: 301,
    headers: {
      'Location': '/admin.html'
    }
  });
}