/**
 * Pre-hydration module-load recovery. Inlined (with CSP nonce) in the root
 * document so it works even if no JS module ever loads. Mirrors the patterns
 * and guard in module-load-recovery.ts.
 *
 * Flow: record module errors; reload once per path per 10s; if the guard
 * blocks, or the page is still unhydrated 10s after load with an error
 * recorded, mount the static fallback from its <template>.
 */
export const FALLBACK_ID = "vamsa-load-fallback";

/** Static fallback markup, cloned out of a <template> only when needed. */
export const FALLBACK_HTML = `<div id="${FALLBACK_ID}-root" role="alert" style="position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;text-align:center;background:var(--color-background,oklch(0.98 0.01 80));color:var(--color-foreground,oklch(0.22 0.05 145));font-family:'Source Sans 3',system-ui,sans-serif"><h1 style="font-family:Fraunces,Georgia,serif;font-size:1.5rem;font-weight:600;margin:0">Vamsa couldn&#39;t finish loading</h1><p style="margin:0.5rem 0 1.5rem;max-width:24rem">Part of the page failed to load. Check your connection and reload.</p><button id="${FALLBACK_ID}-btn" type="button" style="background:var(--color-primary,oklch(0.38 0.12 145));color:var(--color-primary-foreground,oklch(0.98 0.01 80));border:0;border-radius:0.375rem;padding:0.625rem 1.25rem;font-size:0.875rem;font-weight:500;cursor:pointer">Reload</button></div>`;

export const MODULE_FALLBACK_SCRIPT = `(function(){
var K="vamsa:module-reload",W=10000,err=false,re=/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;
function hydrated(){return !!document.documentElement.dataset.hydrated}
function show(){if(document.getElementById("${FALLBACK_ID}-root"))return;var t=document.getElementById("${FALLBACK_ID}");if(!t||!t.content)return;document.body.appendChild(t.content.cloneNode(true));var b=document.getElementById("${FALLBACK_ID}-btn");if(b)b.addEventListener("click",function(){location.reload()})}
function reload(){var s=null,l=null,p=location.pathname,n=Date.now();
try{s=sessionStorage;l=JSON.parse(s.getItem(K)||"null")}catch(e){}
if(!s||(l&&l.path===p&&n-l.ts>=0&&n-l.ts<W)){show();return}
try{s.setItem(K,JSON.stringify({path:p,ts:n}))}catch(e){show();return}
location.reload()}
function fail(){err=true;if(!hydrated())reload()}
window.addEventListener("vite:preloadError",function(e){e.preventDefault();fail()});
window.addEventListener("error",function(e){var t=e.target;
if(t&&t.tagName==="SCRIPT"&&t.type==="module"){fail();return}
if(re.test(String(e.message||(e.error&&e.error.message)||"")))fail()},true);
window.addEventListener("unhandledrejection",function(e){var r=e.reason;
if(re.test(String((r&&r.message)||r||"")))fail()});
window.addEventListener("load",function(){setTimeout(function(){if(err&&!hydrated())show()},10000)});
})()`;
