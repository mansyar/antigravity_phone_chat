import { CDPConnection, Snapshot } from "../types/index.js";

/**
 * Capture chat snapshot from Antigravity session
 */
export async function captureSnapshot(
  cdp: CDPConnection,
): Promise<Snapshot | null> {
  const CAPTURE_SCRIPT = `(() => {
    try {
        const cascade = document.getElementById('cascade');
        if (!cascade) return { error: 'cascade not found' };
        
        const cascadeStyles = window.getComputedStyle(cascade);
        
        // Find the main scrollable container
        const scrollContainer = cascade.querySelector('.overflow-y-auto, [data-scroll-area]') || cascade;
        const scrollInfo = {
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
            scrollPercent: scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight) || 0
        };
        
        // Clone cascade to modify it without affecting the original
        const clone = cascade.cloneNode(true);
        
        // Remove the input box / chat window
        const inputContainer = clone.querySelector('[contenteditable="true"]')?.closest('div[id^="cascade"] > div');
        if (inputContainer) {
            inputContainer.remove();
        }
        
        const html = clone.outerHTML;
        
        let allCSS = '';
        for (const sheet of document.styleSheets) {
            try {
                // @ts-ignore
                const rules = sheet.cssRules || sheet.rules;
                for (const rule of rules) {
                    allCSS += rule.cssText + '\\n';
                }
            } catch (e) { }
        }
        
        return {
            html: html,
            css: allCSS,
            backgroundColor: cascadeStyles.backgroundColor,
            color: cascadeStyles.color,
            fontFamily: cascadeStyles.fontFamily,
            scrollInfo: scrollInfo,
            stats: {
                nodes: clone.getElementsByTagName('*').length,
                htmlSize: html.length,
                cssSize: allCSS.length
            }
        };
    } catch(err) {
        return { error: err.toString() };
    }
  })()`;

  for (const ctx of cdp.contexts) {
    try {
      const result = await cdp.call("Runtime.evaluate", {
        expression: CAPTURE_SCRIPT,
        returnByValue: true,
        contextId: ctx.id,
      });

      if (result.result && result.result.value) {
        if (!result.result.value.error) {
          if (
            !cdp.lastSuccessfulContextId ||
            cdp.lastSuccessfulContextId !== ctx.id
          ) {
            console.log(
              `✨ Success! Captured snapshot from context [${ctx.id}] ${ctx.name || "unnamed"}`,
            );
            cdp.lastSuccessfulContextId = ctx.id;
          }
          return result.result.value as Snapshot;
        }
      }
    } catch (e: any) {
      // Ignore single context errors
    }
  }

  return null;
}
