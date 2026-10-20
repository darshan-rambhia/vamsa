/**
 * Pre-hydration module-load recovery. Inlined (with CSP nonce) in the root
 * document so it works even if no JS module ever loads. Mirrors the patterns
 * and guard in module-load-recovery.ts.
 *
 * Flow: record module errors; reload once per path per 10s; if the guard
 * blocks, or the page is still unhydrated 10s after load with an error
 * recorded, reveal the static fallback.
 */
export const FALLBACK_ID = "vamsa-load-fallback";

export const MODULE_FALLBACK_SCRIPT = `(function(){
var K="vamsa:module-reload",W=10000,err=false,re=/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;
function hydrated(){return !!document.documentElement.dataset.hydrated}
function show(){var f=document.getElementById("${FALLBACK_ID}");if(f){f.hidden=false;f.style.display="flex"}}
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
document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("${FALLBACK_ID}-btn");if(b)b.addEventListener("click",function(){location.reload()})});
})()`;
