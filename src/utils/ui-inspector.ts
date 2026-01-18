import { CDPConnection } from "../types/index.js";

/**
 * Inspect UI tree of Antigravity for debugging
 */
export async function inspectUI(cdp: CDPConnection): Promise<any> {
  const INSPECT_SCRIPT = `(() => {
        function serialize(el) {
            return {
                tag: el.tagName,
                id: el.id,
                className: el.className,
                children: Array.from(el.children).map(serialize),
                text: el.children.length === 0 ? el.textContent?.trim() : undefined,
                rect: el.getBoundingClientRect()
            };
        }
        
        const cascade = document.getElementById('cascade');
        if (!cascade) return { error: 'cascade not found' };
        
        // Focus on the input container specifically
        const inputContainer = cascade.querySelector('[contenteditable="true"]')?.closest('div[id^="cascade"] > div') || cascade;
        
        return serialize(inputContainer);
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const result = await cdp.call("Runtime.evaluate", {
        expression: INSPECT_SCRIPT,
        returnByValue: true,
        contextId: ctx.id,
      });

      if (result.result && result.result.value) {
        return result.result.value;
      }
    } catch (e) {}
  }

  return { error: "No context found or inspection failed" };
}
