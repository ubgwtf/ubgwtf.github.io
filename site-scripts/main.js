console.log('hello world');
const API_ENDPOINT   = 'https://iframe-stat-api.bitlog.workers.dev/api/iframe-stat'; 
const FLUSH_INTERVAL = 20000;   
const MAX_BUFFER     = 10;      

const WHITELIST = [
'tbg95.github.io',
'bitlifeonline.github.io',
'eggycaronline.io',
'slope-game.github.io',
'soccerlegends.github.io',
'trafficjam3d.github.io',
'penaltyshooters.gitlab.io',
'motox3m.gitlab.io',
];

const UID_KEY = 'tbg95-uid-iframe';
let uid = localStorage.getItem(UID_KEY);
if (!uid) {
uid = crypto.randomUUID();
localStorage.setItem(UID_KEY, uid);
}

const buffer = new Map();
let flushTimer;

const domainOf = url => {
try { return new URL(url).hostname; }
catch { return '(invalid)';        }
};
const isWhitelisted = host => WHITELIST.includes(host.toLowerCase());

function addHit(iframeUrl, parentHost) {
if (isWhitelisted(parentHost)) return;

if (!buffer.has(iframeUrl))
    buffer.set(iframeUrl, { hits: 0, parents: {} });

const rec = buffer.get(iframeUrl);
rec.hits += 1;
rec.parents[parentHost] = (rec.parents[parentHost] || 0) + 1;

const totalHits = [...buffer.values()].reduce((s, r) => s + r.hits, 0);
if (totalHits >= MAX_BUFFER) flushBuffer();
}

function flushBuffer() {
if (buffer.size === 0) return;

const payload = [...buffer.entries()].map(([iframeUrl, data]) => ({
    iframeUrl,
    hits   : data.hits,
    parents: data.parents
}));

if (navigator.sendBeacon) {
    navigator.sendBeacon(
    API_ENDPOINT,
    new Blob([JSON.stringify({
        uid, ts: Date.now(), data: payload
    })], { type: 'application/json' })
    );
} else {
    // Fallback to fetch
    fetch(API_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
        uid, ts: Date.now(), data: payload
    }),
    headers: {
        'Content-Type': 'application/json'
    },
    // Use keepalive to mimic sendBeacon behavior
    keepalive: true
    }).catch(err => console.warn('Failed to send analytics:', err));
}

console.table(payload);    

buffer.clear();
clearTimeout(flushTimer);
flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
}

(function () {
const iframeUrl  = location.href;
const parentHost = domainOf(document.referrer || '(no-referrer)');

addHit(iframeUrl, parentHost);

flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBuffer();
});
})();