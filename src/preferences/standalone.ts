/**
 * Marks `<html data-standalone>` when the page was opened from an iPhone's
 * Home Screen icon (vision, Team convention 11), so the header can start lower
 * there only.
 *
 * Why a script and not `@media (display-mode: standalone)`: that query did not
 * take effect on Ben's iPhone (the extra offset it gated never showed; the
 * likely reason is that this site has no web app manifest, inferred, not
 * confirmed). `navigator.standalone` is Apple's own flag for a Home Screen
 * launch, so it is read first, with `display-mode` as the fallback for other
 * platforms. A browser tab and a desktop get neither, so nothing changes there.
 *
 * Runs in `<head>` while the HTML is parsed, before the first paint, so the
 * header never jumps.
 */
export const STANDALONE_BOOT_SCRIPT = `(function(){try{if(navigator.standalone===true||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches))document.documentElement.setAttribute("data-standalone","")}catch(e){}})()`;
