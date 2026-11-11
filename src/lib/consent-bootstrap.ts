/**
 * Shared by the server layout and the client consent store. No "use client":
 * the layout inlines `consentBootstrap` as a plain string.
 */
export const consentKey = "katsodi.consent";
export const consentVersion = 1;

/**
 * Runs before first paint. The consent banner is part of the server HTML so
 * it paints with the page instead of appearing after hydration (which made it
 * the late LCP element and a layout shift); a stored, valid choice marks
 * <html data-consent> and CSS hides the banner until React removes it.
 */
export const consentBootstrap = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(consentKey)})||"null");if(c&&c.v===${consentVersion}&&typeof c.externalMedia==="boolean"&&typeof c.at==="string")document.documentElement.dataset.consent="set";}catch(e){}})();`;
