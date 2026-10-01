import puppeteer from '@cloudflare/puppeteer';

const page = `<!doctype html>
<html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>הדפדפן הפרטי שלי</title>
<style>
  :root{font-family:system-ui,Arial,sans-serif;color:#102235;background:#f2f6fa}
  *{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:960px;margin:auto}
  section{background:white;border:1px solid #dbe5ee;border-radius:18px;padding:24px;box-shadow:0 8px 25px #172d4310}
  h1{margin:0 0 8px}p{color:#40556b}form{display:flex;gap:10px;flex-wrap:wrap}
  input{flex:1;min-width:240px;padding:13px;border:1px solid #9cb0c3;border-radius:9px;font:inherit;direction:ltr}
  button{background:#1257a6;color:white;border:0;border-radius:9px;padding:13px 20px;font:inherit;cursor:pointer}
  button:disabled{opacity:.6;cursor:wait}#status{min-height:1.5em}#result[hidden]{display:none}
  img{width:100%;height:auto;border:1px solid #ccd8e4;border-radius:9px}
  pre{white-space:pre-wrap;word-break:break-word;line-height:1.7;background:#f4f7fa;padding:16px;border-radius:9px;max-height:360px;overflow:auto}
</style>
<main><section><h1>הדפדפן הפרטי שלי</h1><p>הדבק כתובת HTTPS לקבלת צילום מסך ותוכן הדף.</p>
<form id="form"><input id="url" type="url" inputmode="url" placeholder="https://example.com" required pattern="https://.*" aria-label="כתובת האתר"><button id="go">פתח דף</button></form>
<p id="status" role="status" aria-live="polite"></p>
<div id="result" hidden><h2 id="title"></h2><p id="address"></p><img id="shot" alt="צילום מסך של האתר"><h3>טקסט מהדף</h3><pre id="content"></pre></div>
</section></main>
<script>
const form=document.getElementById('form'),button=document.getElementById('go'),status=document.getElementById('status'),result=document.getElementById('result');
form.addEventListener('submit',async event=>{
  event.preventDefault();result.hidden=true;button.disabled=true;status.textContent='פותח את הדף...';
  try{
    const response=await fetch('/api/inspect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:document.getElementById('url').value})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'הבקשה נכשלה');
    document.getElementById('title').textContent=data.title||'ללא כותרת';
    document.getElementById('address').textContent=data.url;
    document.getElementById('content').textContent=data.text||'לא נמצא טקסט בדף';
    document.getElementById('shot').src='data:image/jpeg;base64,'+data.screenshot;
    result.hidden=false;status.textContent='הדף נטען.';
  }catch(error){status.textContent=error.message||'שגיאה בפתיחת הדף';}
  finally{button.disabled=false;}
});
</script></html>`;

const githubOrigin = 'https://shmuel-lamed.github.io';
function corsHeaders(request) {
  return request.headers.get('origin') === githubOrigin ? {
    'access-control-allow-origin': githubOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin',
  } : {};
}
function json(value, status = 200, request) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(request ? corsHeaders(request) : {}) },
  });
}

function allowedUrl(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('נדרשת כתובת HTTPS תקינה.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') ||
      hostname.endsWith('.internal') || hostname.includes(':') || /^\d+(\.\d+){3}$/.test(hostname)) {
    throw Error('יש להזין כתובת אתר ציבורי.');
  }
  return url.toString();
}

export default {
  async fetch(request, env, ctx) {
    // Fail closed: Access must authenticate each request, including the HTML page.
    if (!ctx.access) return new Response('Cloudflare Access required', { status: 403 });
    const route = new URL(request.url);
    if (route.pathname === '/' && request.method === 'GET') {
      return new Response(page, { headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff',
      } });
    }
    if (route.pathname === '/api/inspect' && request.method === 'OPTIONS' && request.headers.get('origin') === githubOrigin) return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (route.pathname !== '/api/inspect' || request.method !== 'POST') return json({ error: 'לא נמצא' }, 404, request);
    if (![route.origin, githubOrigin].includes(request.headers.get('origin'))) return json({ error: 'בקשה לא מורשית' }, 403, request);
    if (!['application/json', 'text/plain'].some(type => request.headers.get('content-type')?.startsWith(type))) return json({ error: 'נדרש גוף בקשה תקין' }, 415, request);
    if (Number(request.headers.get('content-length') || '0') > 4096) return json({ error: 'בקשה גדולה מדי' }, 413, request);

    let target;
    try {
      const body = await request.json();
      target = allowedUrl(body.url);
    } catch {
      return json({ error: 'יש להזין כתובת HTTPS של אתר ציבורי' }, 400, request);
    }

    let browser;
    try {
      browser = await puppeteer.launch(env.BROWSER);
      const tab = await browser.newPage();
      await tab.setViewport({ width: 1280, height: 800 });
      await tab.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const finalUrl = allowedUrl(tab.url());
      const title = await tab.title();
      const text = await tab.evaluate(() => document.body?.innerText?.slice(0, 5000) || '');
      const screenshot = await tab.screenshot({ type: 'jpeg', quality: 65 });
      return json({ url: finalUrl, title, text, screenshot: Buffer.from(screenshot).toString('base64') }, 200, request);
    } catch (error) {
      console.error('Browser Run:', error);
      return json({ error: 'לא הצלחתי לפתוח את האתר. בדוק את הכתובת ונסה שוב.' }, 502, request);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  },
};
