/**
 * PATCH V4: source-player direto multisites (BRTV/MEGA/SUP/WEB)
 * CRONOS CINE INTERCLEAN WORKER
 * PATCH V2: multiplayers DooPlay via wp-json + admin-ajax
 * URL alvo: https://royal-snowflake-8e2c.getapi-oi.workers.dev/
 *
 * Modos:
 *   ?url=URL                         -> proxy HTML/imagem/vídeo com limpeza
 *   ?modo=imagem&url=URL             -> proxy seguro de imagem
 *   ?modo=players&url=URL            -> detector de players limpos
 *   ?modo=fonte&url=URL              -> JSON com fonte limpa
 *   ?modo=limpo&url=URL              -> HTML limpo em texto
 *   ?modo=dados&url=URL              -> extração simples de dados
 */

const DEFAULT_BASE = 'https://www.boraflix.click/';

const SITES = {
  b01: 'https://www.boraflix.click/',
  p02: 'https://www.boraflixtv.com/',
  m03: 'https://megacine.boats/',
  e04: 'https://www.ebaflix.com/',
  s06: 'https://www.seriesonlineweb.lol/',
  s05: 'https://www.seriesonlineweb.lol/', // compatibilidade com versões antigas
  u06: 'https://superseries.life/',
  l07: 'https://lisoflix.net/',
  primeflix: 'https://primeflix.mom/'
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Range, Accept, Origin, Referer, User-Agent, X-Requested-With',
  'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Location',
  'cross-origin-resource-policy': 'cross-origin'
};

const JSON_HEADERS = {
  ...CORS,
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const TEXT_HEADERS = {
  ...CORS,
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store'
};

const IMG_HEADERS = {
  ...CORS,
  'cache-control': 'public, max-age=86400'
};

const BLOCKED_HOST_PATTERNS = [
  'doubleclick', 'googlesyndication', 'google-analytics', 'googletagmanager', 'adservice',
  'adsterra', 'popads', 'propeller', 'monetag', 'juicyads', 'exoclick', 'onclick',
  'trafficjunky', 'admaven', '22bet', 'betano', 'facebook.com', 'facebook.net', 'lingovideo', 'ads-banner', 'banner-friends'
];

const FIXED_ALLOWED_HOSTS = [
  // fontes CINE
  'boraflix.click', 'www.boraflix.click',
  'boraflixtv.com', 'www.boraflixtv.com',
  'boraflix.com', 'www.boraflix.com',
  'megacine.boats', 'www.megacine.boats',
  'ebaflix.com', 'www.ebaflix.com',
  'seriesonlineweb.lol', 'www.seriesonlineweb.lol',
  'superseries.life', 'www.superseries.life',
  'lisoflix.net', 'www.lisoflix.net',
  'primeflix.mom', 'www.primeflix.mom',

  // imagens/metadados
  'image.tmdb.org', 'www.themoviedb.org', 'themoviedb.org',

  // players conhecidos
  'superflixapi.best', 'superflixapi.online', 'superflixapi.com',
  'superembeds.com', 'superembed.stream', 'superembed.net', 'superembed.xyz',
  'megaembed.com', 'megaembed.net', 'megaembed.to', 'megaembed.cc',
  'viewplayer.online', 'www.viewplayer.online',
  'playerthree.online', 'www.playerthree.online',
  'playerembedapi.link', 'www.playerembedapi.link',
  'myvidplay.com', 'www.myvidplay.com',
  'warezcdn.lat', 'www.warezcdn.lat',
  'suaap.com', 'www.suaap.com',
  'abyssplayer.com', 'www.abyssplayer.com',
  'vidsrc.to', 'www.vidsrc.to',
  'vidsrc.me', 'www.vidsrc.me',
  'multiembed.mov', 'www.multiembed.mov'
];

export default {
  async fetch(request) {
    try {
      if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

      const req = new URL(request.url);
      const apiBase = req.origin + req.pathname;
      const modo = normalizarModo(req.searchParams.get('modo') || '');
      const alvo = req.searchParams.get('url') || req.searchParams.get('u') || req.searchParams.get('target') || req.searchParams.get('src') || '';

      if (!alvo && !modo) return ajuda(apiBase);
      if (modo === 'ajuda') return ajuda(apiBase);
      if (modo === 'imagem') return await proxyImagem(request, alvo);
      if (modo === 'players' || modo === 'player' || modo === 'detectar') return await respostaPlayers(alvo, apiBase);
      if (modo === 'fonte' || modo === 'json' || modo === 'source') return await respostaFonte(alvo, apiBase);
      if (modo === 'limpo' || modo === 'txt') return await respostaLimpa(alvo, apiBase);
      if (modo === 'dados') return await respostaDados(alvo, apiBase);

      return await proxyNormal(request, alvo, apiBase);
    } catch (e) {
      return json({ ok: false, erro: String(e && e.message ? e.message : e) }, 500);
    }
  }
};

function ajuda(apiBase) {
  return json({
    ok: true,
    nome: 'CRONOS CINE INTERCLEAN WORKER',
    worker: apiBase,
    modos: {
      proxy: `${apiBase}?url=https%3A%2F%2Fwww.boraflix.click%2Ffilmes%2F`,
      players: `${apiBase}?modo=players&url=https%3A%2F%2Fwww.boraflix.click%2Ffilmes%2Fexemplo%2F`,
      imagem: `${apiBase}?modo=imagem&url=https%3A%2F%2Fwww.boraflix.click%2Fwp-content%2Fuploads%2Fposter.jpg`,
      fonte: `${apiBase}?modo=fonte&url=https%3A%2F%2Fwww.boraflix.click%2F`,
      limpo: `${apiBase}?modo=limpo&url=https%3A%2F%2Fwww.boraflix.click%2F`,
      dados: `${apiBase}?modo=dados&url=https%3A%2F%2Fwww.boraflix.click%2Ffilmes%2F`
    }
  });
}

function normalizarModo(s) {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]/g, '');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: JSON_HEADERS });
}

function absolutar(raw, base = DEFAULT_BASE) {
  let s = String(raw || '').trim()
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');

  if (!s) return '';
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.startsWith('//')) s = 'https:' + s;
  return new URL(s, base || DEFAULT_BASE).toString();
}

function host(url) {
  try { return new URL(absolutar(url)).hostname.toLowerCase(); }
  catch { return ''; }
}

function hostSemWWW(url) {
  return host(url).replace(/^www\./, '');
}

function pathname(url) {
  try { return new URL(absolutar(url)).pathname.toLowerCase(); }
  catch { return ''; }
}

function isFonteSite(url) {
  const h = hostSemWWW(url);
  return [
    'boraflix.click', 'boraflixtv.com', 'boraflix.com', 'megacine.boats',
    'ebaflix.com', 'seriesonlineweb.lol', 'superseries.life', 'lisoflix.net', 'primeflix.mom'
  ].includes(h);
}

function siteOrigem(url) {
  const h = hostSemWWW(url);
  if (h === 'boraflix.click' || h === 'boraflix.com') return 'b01';
  if (h === 'boraflixtv.com') return 'p02';
  if (h === 'megacine.boats') return 'm03';
  if (h === 'ebaflix.com') return 'e04';
  if (h === 'seriesonlineweb.lol') return 's06';
  if (h === 'superseries.life') return 'u06';
  if (h === 'lisoflix.net') return 'l07';
  if (h === 'primeflix.mom') return 'primeflix';
  return '';
}

function isAdHost(h) {
  const x = String(h || '').toLowerCase();
  return BLOCKED_HOST_PATTERNS.some(p => x.includes(p));
}

function hostPermitido(url) {
  let h = '';
  try { h = new URL(absolutar(url)).hostname.toLowerCase(); } catch { return false; }
  const clean = h.replace(/^www\./, '');

  if (!h || isAdHost(h)) return false;
  if (FIXED_ALLOWED_HOSTS.includes(h) || FIXED_ALLOWED_HOSTS.includes(clean)) return true;

  if (h.endsWith('.blogger.com')) return true;
  if (h.endsWith('.googlevideo.com') || h.includes('googlevideo.com')) return true;
  if (h.endsWith('.superflixapi.best') || h.endsWith('.superflixapi.online')) return true;
  if (h.endsWith('.superembeds.com')) return true;

  // Permite descoberta de players/CDNs novos, mas bloqueia domínios claramente publicitários acima.
  if (/player|embed|stream|video|cdn|media|play|hls|mp4|m3u8|warez|vid|flix/i.test(h)) return true;
  if (h.endsWith('.cloud') && /cine|filme|series|video|stream|play|cdn|hd/i.test(h)) return true;
  if (h.endsWith('.online') && /cine|film|serie|play|video|stream|cdn|player/i.test(h)) return true;
  if (h.endsWith('.life') && /serie|cine|play|stream|video/i.test(h)) return true;

  return false;
}

function validarUrl(url, opts = {}) {
  let u;
  try { u = new URL(absolutar(url)); }
  catch { return { ok: false, erro: 'URL inválida.', status: 400 }; }

  if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, erro: 'Protocolo bloqueado.', status: 403 };
  if (!hostPermitido(u.toString())) return { ok: false, erro: 'Host bloqueado: ' + u.hostname, status: 403 };

  const p = u.pathname.toLowerCase();
  // O DooPlay pode resolver players via /wp-admin/admin-ajax.php.
  // Bloqueia admin comum, mas libera somente o admin-ajax público usado pelo player.
  const ehAdminAjaxSeguro = p.endsWith('/wp-admin/admin-ajax.php');
  if ((p.includes('/wp-admin/') && !ehAdminAjaxSeguro) || (p.includes('/admin/') && !ehAdminAjaxSeguro)) {
    return { ok: false, erro: 'Rota administrativa bloqueada.', status: 403 };
  }

  if (opts.imagem) {
    const okImg = /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|#|$)/i.test(u.toString()) ||
      p.includes('/wp-content/uploads/') || p.startsWith('/t/p/') || p.startsWith('/img/') ||
      p.startsWith('/image/') || p.startsWith('/images/') || p.startsWith('/assets/') ||
      u.hostname.toLowerCase().includes('image.tmdb.org');
    if (!okImg) return { ok: false, erro: 'Imagem fora das rotas permitidas.', status: 403 };
  }

  return { ok: true, url: u.toString() };
}

function refererDe(url) {
  const s = siteOrigem(url);
  if (s && SITES[s]) return SITES[s];
  const h = host(url);
  if (!h) return DEFAULT_BASE;
  if (/superflix|superembed|viewplayer|playerthree|suaap|megaembed|warez|myvidplay|abyss|lisoflix/i.test(h)) return DEFAULT_BASE;
  return `https://${h}/`;
}

function baseHeaders(url, extra = {}) {
  return {
    'user-agent': 'Mozilla/5.0 CronosCineInterclean/1.0',
    'accept': '*/*',
    'referer': refererDe(url),
    ...extra
  };
}

async function buscar(url, opts = {}) {
  const v = validarUrl(url, opts.validar || {});
  if (!v.ok) throw new Error(v.erro);

  const headers = baseHeaders(v.url, opts.headers || {});
  if (opts.range) headers.range = opts.range;

  return await fetch(v.url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body || undefined,
    redirect: 'follow',
    cf: { cacheTtl: opts.cache ? 86400 : 0, cacheEverything: !!opts.cache }
  });
}

async function buscarTexto(url, aceitarErro = true) {
  const resp = await buscar(url, {
    headers: { 'accept': 'text/html,application/xhtml+xml,application/json,text/plain,*/*' }
  });
  const contentType = resp.headers.get('content-type') || '';
  const html = await resp.text();
  if (!resp.ok && !aceitarErro) throw new Error('HTTP ' + resp.status);
  return { resp, status: resp.status, contentType, html };
}

async function proxyNormal(request, alvo, apiBase) {
  const v = validarUrl(alvo);
  if (!v.ok) return json({ ok: false, erro: v.erro, url: alvo }, v.status || 403);

  const url = v.url;
  const range = request.headers.get('range') || '';
  const method = String(request.method || 'GET').toUpperCase();
  const headers = {
    'accept': request.headers.get('accept') || 'text/html,application/xhtml+xml,image/avif,image/webp,image/apng,video/mp4,video/*,*/*'
  };
  const ctReq = request.headers.get('content-type') || '';
  if (ctReq) headers['content-type'] = ctReq;
  const xrw = request.headers.get('x-requested-with') || '';
  if (xrw) headers['x-requested-with'] = xrw;
  let body = undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    body = await request.arrayBuffer();
  }
  const resp = await buscar(url, {
    method,
    body,
    range,
    headers
  });

  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (ct.startsWith('image/')) return await streamResponse(resp, true);
  if (ct.startsWith('video/') || isVideoFinal(url) || isVideoFinal(resp.url || '')) return await streamResponse(resp, false);

  if (/text\/html|application\/xhtml/i.test(ct) || !ct || /text\/plain/i.test(ct)) {
    const body = await resp.text();
    const safe = filtrarHTML(body, { apiBase, baseUrl: url, removerIframes: false });
    return new Response(safe.html, {
      status: resp.status,
      headers: {
        ...CORS,
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  return await streamResponse(resp, false);
}

async function proxyImagem(request, alvo) {
  const v = validarUrl(alvo, { imagem: true });
  if (!v.ok) return placeholder(v.erro || 'Imagem bloqueada');

  let resp;
  try {
    resp = await buscar(v.url, {
      cache: true,
      validar: { imagem: true },
      headers: { 'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*' }
    });
  } catch (e) {
    return placeholder('Imagem indisponível');
  }

  const ct = resp.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('image/')) return placeholder('Não é imagem');

  return await streamResponse(resp, true, IMG_HEADERS);
}

async function streamResponse(resp, cache = false, extraHeaders = {}) {
  const h = new Headers();
  const keep = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified', 'location'];
  for (const k of keep) {
    const v = resp.headers.get(k);
    if (v) h.set(k, v);
  }
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  for (const [k, v] of Object.entries(extraHeaders || {})) h.set(k, v);
  h.set('cache-control', cache ? 'public, max-age=86400' : 'no-store');
  return new Response(resp.body, { status: resp.status, headers: h });
}

function placeholder(msg = 'Poster') {
  const safe = String(msg).slice(0, 40).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="#050505"/><rect x="14" y="14" width="472" height="722" rx="18" fill="#080808" stroke="#00ffff" stroke-width="2" opacity="0.9"/><text x="250" y="360" text-anchor="middle" fill="#00ffff" font-size="32" font-family="Arial" font-weight="700">${safe}</text><text x="250" y="402" text-anchor="middle" fill="#ffcc00" font-size="18" font-family="Arial">CRONOS CINE</text></svg>`;
  return new Response(svg, { status: 200, headers: { ...CORS, 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' } });
}

function isVideoFinal(url) {
  const s = String(url || '').toLowerCase();
  return /\.(mp4|m3u8|webm|mov)(\?|#|$)/i.test(s) || /\/hls\/|\/video\//i.test(s);
}

function ehImagemUrl(raw) {
  const s = String(raw || '');
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|#|$)/i.test(s) ||
    /\/wp-content\/uploads\//i.test(s) ||
    /image\.tmdb\.org\/t\/p\//i.test(s) ||
    /\/img\//i.test(s) || /\/images\//i.test(s) || /\/assets\//i.test(s);
}

function proxificarImagem(raw, baseUrl, apiBase) {
  if (!raw || !apiBase) return raw || '';
  let s = String(raw).trim().replace(/&amp;/g, '&').replace(/&#038;/g, '&');
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.includes(apiBase) || s.includes('modo=imagem&url=')) return s;

  let abs = '';
  try { abs = absolutar(s, baseUrl); } catch { return s; }
  if (!ehImagemUrl(abs)) return s;
  const v = validarUrl(abs, { imagem: true });
  if (!v.ok) return s;
  return `${apiBase}?modo=imagem&url=${encodeURIComponent(abs)}`;
}

function attr(tag, name) {
  const re = new RegExp(name + `\\s*=\\s*['"]([^'"]+)['"]`, 'i');
  const m = String(tag || '').match(re);
  return m ? m[1] : '';
}

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extrairUrlsImportantes(texto) {
  const out = [];
  const seen = new Set();
  const add = (u) => {
    u = String(u || '').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\\\//g, '/').trim();
    if (!u || seen.has(u)) return;
    seen.add(u); out.push(u);
  };

  const regs = [
    /https?:\/\/[^"'<>\\\s]*(?:superflixapi|superembeds|superembed|megaembed|viewplayer|playerthree|playerembedapi|myvidplay|warezcdn|suaap|abyssplayer|lisoflix\.net\/abyss|trembed|\.mp4|\.m3u8)[^"'<>\\\s]*/gi,
    /(?:source|src|file|url)=((?:https?%3A%2F%2F|https?:\/\/)[^"'&<>\\\s]+)/gi
  ];

  for (const re of regs) {
    let m;
    while ((m = re.exec(String(texto || '')))) {
      let u = m[1] || m[0];
      try { u = decodeURIComponent(u); } catch {}
      add(u);
    }
  }
  return out;
}

function iframePermitido(src) {
  try {
    const h = host(src);
    if (!src || isAdHost(h)) return false;
    if (/youtube|youtu\.be|youtube-nocookie/i.test(h)) return false;
    if (/\.(jpg|jpeg|png|webp|gif|svg|css|js)(\?|#|$)/i.test(src)) return false;
    return hostPermitido(src);
  } catch { return false; }
}

function filtrarHTML(html, opts = {}) {
  let source = String(html || '');
  const apiBase = opts.apiBase || '';
  const baseUrl = opts.baseUrl || DEFAULT_BASE;
  const removidos = { scripts: 0, noscript: 0, iframes: 0, iframesMantidos: 0, eventosInline: 0, javascriptHref: 0, objects: 0, embeds: 0, metaRefresh: 0, imagensProxificadas: 0 };

  source = source.replace(/<script\b[\s\S]*?<\/script>/gi, (m) => {
    removidos.scripts++;
    const urls = extrairUrlsImportantes(m).slice(0, 40);
    const preservado = urls.length ? ` URLS_PRESERVADAS_CRONOS ${urls.map(escAttr).join(' ')} ` : '';
    const src = attr(m, 'src');
    return `<!-- SCRIPT_REMOVIDO_CRONOS${src ? ' src=' + escAttr(src) : ''}${preservado}-->`;
  });

  source = source.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, () => { removidos.noscript++; return '<!-- NOSCRIPT_REMOVIDO_CRONOS -->'; });
  source = source.replace(/<object\b[\s\S]*?<\/object>/gi, () => { removidos.objects++; return '<!-- OBJECT_REMOVIDO_CRONOS -->'; });
  source = source.replace(/<embed\b[\s\S]*?<\/embed>/gi, () => { removidos.embeds++; return '<!-- EMBED_REMOVIDO_CRONOS -->'; });

  source = source.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (m) => {
    const src = attr(m, 'src');
    if (src && !opts.removerIframes && iframePermitido(absolutar(src, baseUrl))) {
      removidos.iframesMantidos++;
      return m.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '').replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
    }
    removidos.iframes++;
    return `<!-- IFRAME_REMOVIDO_CRONOS${src ? ' src=' + escAttr(src) : ''} -->`;
  });

  source = source
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, () => { removidos.eventosInline++; return ''; })
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, () => { removidos.eventosInline++; return ''; })
    .replace(/javascript\s*:/gi, () => { removidos.javascriptHref++; return 'javascript_removido:'; })
    .replace(/<meta[^>]+http-equiv=["']refresh["'][^>]*>/gi, () => { removidos.metaRefresh++; return '<!-- META_REFRESH_REMOVIDO_CRONOS -->'; })
    .replace(/<base\b[^>]*>/gi, '');

  if (apiBase) {
    source = source.replace(/\b(src|data-src|data-lazy-src|data-original|poster)=['"]([^'"]+)['"]/gi, (m, nome, valor) => {
      const novo = proxificarImagem(valor, baseUrl, apiBase);
      if (novo !== valor) removidos.imagensProxificadas++;
      return `${nome}="${escAttr(novo)}"`;
    });

    source = source.replace(/\bsrcset=['"]([^'"]+)['"]/gi, (m, valor) => {
      const novo = String(valor).split(',').map(part => {
        const pieces = part.trim().split(/\s+/);
        if (pieces[0]) pieces[0] = proxificarImagem(pieces[0], baseUrl, apiBase);
        return pieces.join(' ');
      }).join(', ');
      return `srcset="${escAttr(novo)}"`;
    });

    source = source.replace(/url\((['"]?)([^'")]+)\1\)/gi, (m, q, valor) => `url("${escAttr(proxificarImagem(valor, baseUrl, apiBase))}")`);
    source = source.replace(/https?:\/\/[^"'\\\s<>]+(?:\/wp-content\/uploads\/|image\.tmdb\.org\/t\/p\/|\/img\/|\/images\/|\/assets\/)[^"'\\\s<>]+\.(?:jpg|jpeg|png|webp|gif|svg|avif)(?:\?[^"'\\\s<>]*)?/gi, (m) => proxificarImagem(m, baseUrl, apiBase));
  }

  return { html: source, removidos };
}

function resumo(html) {
  const s = String(html || '');
  return {
    scripts: (s.match(/<script\b/gi) || []).length,
    iframes: (s.match(/<iframe\b/gi) || []).length,
    eventosInline: (s.match(/\son[a-z]+=/gi) || []).length,
    imagens: (s.match(/<img\b/gi) || []).length,
    links: (s.match(/<a\b/gi) || []).length,
    playersMarcadores: (s.match(/dooplay_player_option|source-player|superflix|superembed|viewplayer|playerthree|suaap|megaembed|warezcdn/gi) || []).length
  };
}

async function respostaFonte(alvo, apiBase) {
  const v = validarUrl(alvo);
  if (!v.ok) return json({ ok: false, erro: v.erro, url: alvo }, v.status || 403);
  const bruto = await buscarTexto(v.url);
  const seguro = filtrarHTML(bruto.html, { apiBase, baseUrl: v.url, removerIframes: true });
  return json({ ok: true, modo: 'fonte', url: v.url, status: bruto.status, contentType: bruto.contentType, tamanhoOriginal: bruto.html.length, tamanhoSeguro: seguro.html.length, removidos: seguro.removidos, resumo: resumo(bruto.html), source: seguro.html });
}

async function respostaLimpa(alvo, apiBase) {
  const v = validarUrl(alvo);
  if (!v.ok) return new Response(v.erro, { status: v.status || 403, headers: TEXT_HEADERS });
  const bruto = await buscarTexto(v.url);
  const seguro = filtrarHTML(bruto.html, { apiBase, baseUrl: v.url, removerIframes: true });
  return new Response(seguro.html, { status: 200, headers: TEXT_HEADERS });
}

function limparTexto(s) {
  return String(s || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html, name) {
  const n = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regs = [
    new RegExp(`<meta[^>]+property=["']${n}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["'][^>]*>`, 'i')
  ];
  for (const re of regs) {
    const m = String(html || '').match(re);
    if (m) return limparTexto(m[1]);
  }
  return '';
}

async function respostaDados(alvo, apiBase) {
  const v = validarUrl(alvo);
  if (!v.ok) return json({ ok: false, erro: v.erro, url: alvo }, v.status || 403);
  const bruto = await buscarTexto(v.url);
  const html = bruto.html;
  const titulo = limparTexto((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || meta(html, 'og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const imagem = proxificarImagem(meta(html, 'og:image') || '', v.url, apiBase);
  const sinopse = meta(html, 'description') || meta(html, 'og:description') || '';
  return json({ ok: true, modo: 'dados', url: v.url, status: bruto.status, contentType: bruto.contentType, titulo, imagem, sinopse, resumo: resumo(html) });
}

function playerBloqueado(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return true;
  if (/youtube|youtu\.be|youtube-nocookie/.test(u)) return true;
  if (/doubleclick|googlesyndication|adservice|adsterra|popads|propeller|monetag|juicyads|exoclick|22bet|betano|facebook|lingovideo|ads-banner|banner-friends/.test(u)) return true;
  if (/\.(jpg|jpeg|png|webp|gif|svg|css|js)(\?|#|$)/i.test(u)) return true;
  if (u.includes('image.tmdb.org')) return true;
  return false;
}

function classePlayer(url) {
  const u = String(url || '').toLowerCase();
  const h = host(url);
  if (/superembeds|superembed/.test(u)) return 'superembeds';
  if (/superflixapi/.test(u)) return 'superflixapi';
  if (/megaembed/.test(u)) return 'megaembed';
  if (/playerembedapi/.test(u)) return 'playerembedapi';
  if (/myvidplay/.test(u)) return 'myvidplay';
  if (/viewplayer/.test(u)) return 'viewplayer';
  if (/playerthree/.test(u)) return 'playerthree';
  if (/suaap/.test(u)) return 'suaap';
  if (/warezcdn/.test(u)) return 'warezcdn';
  if (/abyss|lisoflix\.net\/abyss|trembed/.test(u)) return 'abyss';
  if (isVideoFinal(url)) return 'video';
  if (/embed|player|stream|video|cdn|play/.test(h)) return 'player';
  return 'desconhecido';
}

function nomePlayer(cls, url, label = '') {
  const l = limparTexto(label);
  if (/legendado|\bleg\b/i.test(l)) return 'Legendado';
  if (/dublado|\bdub\b/i.test(l)) return 'Dublado';
  if (cls === 'superembeds') return 'SuperEmbeds';
  if (cls === 'superflixapi') return 'SuperflixAPI';
  if (cls === 'megaembed') return 'MegaEmbed';
  if (cls === 'playerembedapi') return 'PlayerEmbedAPI';
  if (cls === 'myvidplay') return 'MyVidPlay';
  if (cls === 'viewplayer') return 'ViewPlayer';
  if (cls === 'playerthree') return 'PlayerThree';
  if (cls === 'suaap') return 'Suaap';
  if (cls === 'warezcdn') return 'WarezCDN';
  if (cls === 'abyss') return 'Abyss/Liso';
  if (cls === 'video') return 'Vídeo direto';
  const h = host(url).replace(/^www\./, '');
  return h || 'Player';
}

function prioridade(cls) {
  const map = { superembeds: 10, superflixapi: 20, megaembed: 30, playerembedapi: 40, myvidplay: 50, warezcdn: 55, viewplayer: 60, playerthree: 70, abyss: 80, suaap: 85, video: 5, player: 90 };
  return map[cls] || 99;
}

function resolverSuaap(url, base = DEFAULT_BASE) {
  try {
    const abs = absolutar(url, base);
    const u = new URL(abs);
    if (!/suaap\.com|api\/start\/cpurl/i.test(abs)) return abs;
    let t = u.searchParams.get('t') || '';
    t = String(t || '').trim().replace(/&amp;/g, '&').replace(/&#038;/g, '&');
    return t ? absolutar(t, abs) : abs;
  } catch { return url; }
}

function pushPlayer(arr, seen, raw, label = '', origem = '', base = DEFAULT_BASE, apiBase = '') {
  let src = '';
  try { src = absolutar(raw, base); } catch { return; }
  src = resolverSuaap(src, base);
  if (!src || playerBloqueado(src)) return;
  if (!hostPermitido(src)) return;

  const cls = classePlayer(src);
  if (cls === 'desconhecido') return;
  const key = src.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);

  const tipo = isVideoFinal(src) ? 'video' : 'iframe';
  const srcProxy = apiBase ? `${apiBase}?url=${encodeURIComponent(src)}` : src;
  const nome = nomePlayer(cls, src, label);
  const embed = tipo === 'video'
    ? `<video src="${escAttr(srcProxy)}" controls autoplay playsinline preload="auto" style="width:100%;height:100%;background:#000;display:block;object-fit:contain"></video>`
    : `<iframe src="${escAttr(src)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer" style="width:100%;height:100%;border:0;background:#000"></iframe>`;

  arr.push({
    nome,
    label: limparTexto(label),
    classe: cls,
    provedorId: cls,
    tipo,
    origem,
    src,
    srcDireto: src,
    srcProxy,
    playerUrl: tipo === 'video' ? srcProxy : src,
    embed,
    embedCode: embed,
    seguro: true,
    bloqueado: false,
    prioridade: prioridade(cls)
  });
}


function desentidadeBasica(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\\//g, '/')
    .trim();
}

function spanClasseTexto(bloco, classe) {
  const c = String(classe || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<span[^>]+class=["'][^"']*${c}[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i');
  const m = String(bloco || '').match(re);
  return m ? limparTexto(m[1]) : '';
}

function extrairDooplayOptions(html) {
  const out = [];
  const seen = new Set();
  const h = String(html || '').replace(/&amp;/g, '&').replace(/&#038;/g, '&');
  const re = /<li\b([^>]*\bdooplay_player_option\b[^>]*)>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(h))) {
    const tag = '<li ' + (m[1] || '') + '>';
    const body = m[2] || '';
    const post = attr(tag, 'data-post');
    const type = attr(tag, 'data-type');
    const nume = attr(tag, 'data-nume');
    const title = spanClasseTexto(body, 'title') || attr(tag, 'title') || '';
    const server = spanClasseTexto(body, 'server') || '';
    const label = limparTexto([title, server].filter(Boolean).join(' • '));
    if (!post || !type || !nume) continue;
    if (/trailer|youtube|youtu\.be/i.test([nume, title, server].join(' '))) continue;
    const key = [post, type, nume].join('|').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ post, type, nume, title, server, label });
  }
  return out;
}

function extrairUrlsDeRespostaDooplay(raw) {
  const urls = [];
  const seen = new Set();
  const add = (u) => {
    if (u == null) return;
    if (typeof u !== 'string') return walk(u);
    let x = desentidadeBasica(u);
    if (!x) return;
    try { if (/^https?%3a%2f%2f/i.test(x)) x = decodeURIComponent(x); } catch {}
    x = x.replace(/\\\//g, '/').trim();

    let m;
    const iframeRe = /<iframe\b[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((m = iframeRe.exec(x))) add(m[1]);

    const iframeEscRe = /src=\\?["']([^"']+)\\?["']/gi;
    while ((m = iframeEscRe.exec(x))) add(m[1]);

    if (/^https?:\/\//i.test(x) || x.startsWith('//')) {
      const key = x.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
      if (!seen.has(key)) { seen.add(key); urls.push(x); }
    }

    extrairUrlsImportantes(x).forEach(add);
  };
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') return add(v);
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'object') return Object.values(v).forEach(walk);
  };

  const text = String(raw || '').replace(/\\\//g, '/');
  try { walk(JSON.parse(raw)); } catch { add(text); }
  add(text);
  return urls;
}

function dooplayApiRequests(op, pageUrl) {
  const base = (() => { try { const u = new URL(pageUrl); return u.origin + '/'; } catch { return DEFAULT_BASE; } })();
  const post = encodeURIComponent(op.post);
  const type = encodeURIComponent(op.type);
  const nume = encodeURIComponent(op.nume);
  const path = `${post}/${type}/${nume}`;

  const qs = `action=doo_player_ajax&post=${post}&type=${type}&nume=${nume}`;
  const qs2 = `action=dooplay_player_ajax&post=${post}&type=${type}&nume=${nume}`;

  return [
    { method: 'GET', url: new URL(`/wp-json/dooplayer/v2/${path}`, base).toString(), body: '' },
    { method: 'GET', url: new URL(`/?rest_route=/dooplayer/v2/${path}`, base).toString(), body: '' },

    // DooPlay em alguns sites usa admin-ajax em vez do wp-json.
    // Tentamos GET e POST, porque o tema alterna conforme a configuração play_method.
    { method: 'GET', url: new URL(`/wp-admin/admin-ajax.php?${qs}`, base).toString(), body: '' },
    { method: 'POST', url: new URL('/wp-admin/admin-ajax.php', base).toString(), body: qs },
    { method: 'GET', url: new URL(`/wp-admin/admin-ajax.php?${qs2}`, base).toString(), body: '' },
    { method: 'POST', url: new URL('/wp-admin/admin-ajax.php', base).toString(), body: qs2 }
  ];
}

async function resolverDooplayAjax(lista, vistos, html, pageUrl, apiBase) {
  const ops = extrairDooplayOptions(html);
  const debug = { options: ops, tentativas: [], encontrados: 0 };
  if (!ops.length) return debug;

  for (const op of ops) {
    const label = op.label || op.title || op.server || 'Player DooPlay';
    let achou = false;
    for (const reqInfo of dooplayApiRequests(op, pageUrl)) {
      try {
        const headers = {
          'accept': 'application/json,text/plain,text/html,*/*',
          'x-requested-with': 'XMLHttpRequest',
          'referer': pageUrl
        };
        const opts = { headers, method: reqInfo.method || 'GET' };
        if (opts.method === 'POST') {
          headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
          opts.body = reqInfo.body || '';
        }
        const resp = await buscar(reqInfo.url, opts);
        const txt = await resp.text();
        debug.tentativas.push({ nume: op.nume, method: opts.method, status: resp.status, url: reqInfo.url });
        if (!txt) continue;
        const urls = extrairUrlsDeRespostaDooplay(txt);
        for (const u of urls) {
          const antes = lista.length;
          pushPlayer(lista, vistos, u, label, 'dooplay-ajax:' + op.nume, pageUrl, apiBase);
          if (lista.length > antes) { achou = true; debug.encontrados++; }
        }
        if (achou) break;
      } catch (e) {
        debug.tentativas.push({ nume: op.nume, method: reqInfo.method, erro: String(e && e.message ? e.message : e), url: reqInfo.url });
      }
    }
  }
  return debug;
}

async function respostaPlayers(alvo, apiBase) {
  const v = validarUrl(alvo);
  if (!v.ok) return json({ ok: false, erro: v.erro, url: alvo }, v.status || 403);

  const bruto = await buscarTexto(v.url);
  const html = bruto.html;
  const players = await detectarPlayersHTML(html, v.url, apiBase);
  const debugPlayers = players && players.debug ? players.debug : null;

  return json({
    ok: true,
    modo: 'players',
    url: v.url,
    status: bruto.status,
    contentType: bruto.contentType,
    total: players.length,
    players,
    debug: debugPlayers,
    resumo: resumo(html)
  });
}


function labelDooplayPorNume(html, nume) {
  try {
    const n = String(nume || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<li\\b([^>]*data-nume=["']${n}["'][^>]*)>([\\s\\S]*?)<\\/li>`, 'i');
    const m = String(html || '').match(re);
    if (!m) return '';
    const body = m[2] || '';
    const title = spanClasseTexto(body, 'title') || '';
    const server = spanClasseTexto(body, 'server') || '';
    return limparTexto([title, server].filter(Boolean).join(' • ') || body);
  } catch { return ''; }
}

function extrairSourcePlayersDiretosWorker(html, pageUrl, apiBase, lista, vistos) {
  const h = String(html || '').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\\\//g, '/');
  const idRe = /id=["']source-player-([^"']+)["']/gi;
  let m;
  while ((m = idRe.exec(h))) {
    const nume = m[1] || '';
    if (!nume || /trailer|youtube|youtu\.be/i.test(nume)) continue;
    const rest = h.slice(m.index);
    let end = rest.slice(1).search(/id=["']source-player-|id=["']playeroptions|<div[^>]+class=["'][^"']*sheader|<!--\s*Head movie Info/i);
    if (end < 0) end = Math.min(rest.length, 5000); else end = end + 1;
    const bloco = rest.slice(0, end);
    const label = labelDooplayPorNume(h, nume) || '';
    const attrRe = /(?:src|href|data-source|data-src|data-url|data-link)\s*=\s*["']([^"']+)["']/gi;
    let a;
    while ((a = attrRe.exec(bloco))) {
      pushPlayer(lista, vistos, a[1], label, 'source-player:' + nume, pageUrl, apiBase);
    }
  }
}

async function detectarPlayersHTML(html, pageUrl, apiBase) {
  const lista = [];
  const debug = { dooplay: null };
  const vistos = new Set();
  const h = String(html || '').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/\\\//g, '/');
  let m;

  // Se a própria URL já for player, adiciona como candidato.
  if (!isFonteSite(pageUrl)) pushPlayer(lista, vistos, pageUrl, 'Player original', 'url-original', pageUrl, apiBase);

  // Suaap cpurl com target no parâmetro t.
  const suaapRegs = [
    /href=["']([^"']*suaap\.com\/api\/start\/cpurl[^"']*)["']/gi,
    /href=["']([^"']*api\/start\/cpurl[^"']*)["']/gi,
    /(https?:\/\/[^"'<>\s]*suaap\.com\/api\/start\/cpurl[^"'<>\s]*)/gi
  ];
  for (const re of suaapRegs) while ((m = re.exec(h))) pushPlayer(lista, vistos, m[1], 'Dublado', 'suaap-cpurl', pageUrl, apiBase);

  // Blocos DooPlay/source-player: pega iframe, data-src e a[href] dentro dos source-player-* (no_ajax).
  extrairSourcePlayersDiretosWorker(h, pageUrl, apiBase, lista, vistos);

  // Opções AJAX do DooPlay: PLAYER 01, PLAYER 02, HD-BR etc.
  // Algumas páginas só deixam o primeiro iframe pronto; os demais precisam ser resolvidos via wp-json/dooplayer/v2.
  debug.dooplay = await resolverDooplayAjax(lista, vistos, h, pageUrl, apiBase);

  const iframe = /<iframe\b[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = iframe.exec(h))) pushPlayer(lista, vistos, m[1], '', 'iframe', pageUrl, apiBase);

  const media = /<(?:video|source)\b[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = media.exec(h))) pushPlayer(lista, vistos, m[1], '', 'video-source', pageUrl, apiBase);

  const attrs = /<(?:a|button|li|div|span)[^>]+(?:href|title|data-source|data-src|data-url|data-link)\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:a|button|li|div|span)>/gi;
  while ((m = attrs.exec(h))) {
    const label = limparTexto(m[2] || '');
    pushPlayer(lista, vistos, m[1], label, 'attr', pageUrl, apiBase);
  }

  // URLs preservadas em scripts removidos ou soltas no HTML.
  extrairUrlsImportantes(h).forEach(u => pushPlayer(lista, vistos, u, '', 'regex-url', pageUrl, apiBase));

  // Superembed às vezes vem codificado em parâmetros.
  const encoded = /(?:source|src|file|url)=((?:https?%3A%2F%2F)[^"'&<>\s]+)/gi;
  while ((m = encoded.exec(h))) {
    let u = m[1];
    try { u = decodeURIComponent(u); } catch {}
    pushPlayer(lista, vistos, u, '', 'encoded-param', pageUrl, apiBase);
  }

  const out = lista.sort((a, b) => (a.prioridade || 99) - (b.prioridade || 99)).map((p, i) => ({ ...p, index: i + 1 }));
  out.debug = debug;
  return out;
}
