import {
  CDPConnection,
  ActionResult,
  AppState,
  ClickParams,
  ScrollParams,
} from "../types/index.js";

/**
 * Inject message into Antigravity
 */
export async function injectMessage(
  cdp: CDPConnection,
  text: string,
): Promise<ActionResult> {
  const safeText = JSON.stringify(text);

  const EXPRESSION = `(async () => {
        const cancelBtn = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancelBtn && cancelBtn.offsetParent !== null) return { ok:false, reason:"busy" };

        const editors = [...document.querySelectorAll('#cascade [data-lexical-editor="true"][contenteditable="true"][role="textbox"]')]
            .filter(el => el.offsetParent !== null);
        const editor = editors.at(-1);
        if (!editor) return { ok:false, error:"editor_not_found" };

        const textToInsert = ${safeText};

        editor.focus();
        document.execCommand?.("selectAll", false, null);
        document.execCommand?.("delete", false, null);

        let inserted = false;
        try { inserted = !!document.execCommand?.("insertText", false, textToInsert); } catch {}
        if (!inserted) {
            editor.textContent = textToInsert;
            editor.dispatchEvent(new InputEvent("beforeinput", { bubbles:true, inputType:"insertText", data: textToInsert }));
            editor.dispatchEvent(new InputEvent("input", { bubbles:true, inputType:"insertText", data: textToInsert }));
        }

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const submit = document.querySelector("svg.lucide-arrow-right")?.closest("button");
        
        let method = "enter_keypress";
        let submitFound = false;

        if (submit && !submit.disabled) {
            submit.click();
            method = "click_submit";
            submitFound = true;
        } else {
            editor.dispatchEvent(new KeyboardEvent("keydown", { bubbles:true, key:"Enter", code:"Enter" }));
            editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles:true, key:"Enter", code:"Enter" }));
        }
        
        return { 
            ok: true, 
            method: method,
            debug: {
                editorsFound: editors.length,
                submitButtonFound: !!submit,
                submitButtonDisabled: submit ? submit.disabled : null,
                inserted: inserted
            }
        };
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const result = await cdp.call("Runtime.evaluate", {
        expression: EXPRESSION,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });

      if (result.result && result.result.value) {
        return result.result.value;
      }
    } catch (e) {}
  }

  return { ok: false, reason: "no_context" };
}

/**
 * Set AI Mode (Fast/Planning)
 */
export async function setMode(
  cdp: CDPConnection,
  mode: "Fast" | "Planning",
): Promise<ActionResult> {
  const EXP = `(async () => {
        try {
            const allEls = Array.from(document.querySelectorAll('*'));
            const candidates = allEls.filter(el => {
                if (el.children.length > 0) return false;
                const txt = el.textContent?.trim();
                return txt === 'Fast' || txt === 'Planning';
            });

            let modeBtn = null;
            for (const el of candidates) {
                let current = el;
                for (let i = 0; i < 4; i++) {
                    if (!current) break;
                    const style = window.getComputedStyle(current);
                    if (style.cursor === 'pointer' || current.tagName === 'BUTTON') {
                        modeBtn = current;
                        break;
                    }
                    current = current.parentElement;
                }
                if (modeBtn) break;
            }

            if (!modeBtn) return { error: 'Mode indicator/button not found' };
            if (modeBtn.innerText.includes('${mode}')) return { success: true, alreadySet: true };

            modeBtn.click();
            await new Promise(r => setTimeout(r, 600));

            let visibleDialog = Array.from(document.querySelectorAll('[role="dialog"]'))
                                    .find(d => d.offsetHeight > 0 && d.innerText.includes('${mode}'));
            
            if (!visibleDialog) {
                 visibleDialog = Array.from(document.querySelectorAll('div'))
                    .find(d => {
                        const style = window.getComputedStyle(d);
                        return d.offsetHeight > 0 && 
                               (style.position === 'absolute' || style.position === 'fixed') && 
                               d.innerText.includes('${mode}') &&
                               !d.innerText.includes('Files With Changes');
                    });
            }

            if (!visibleDialog) return { error: 'Dropdown not opened or options not visible' };

            const target = Array.from(visibleDialog.querySelectorAll('*')).find(el => 
                el.children.length === 0 && el.textContent?.trim() === '${mode}'
            );

            if (target) {
                target.click();
                await new Promise(r => setTimeout(r, 200));
                return { success: true };
            }
            
            return { error: 'Mode option not found' };
        } catch(err) {
            return { error: err.toString() };
        }
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXP,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });
      if (res.result?.value) return res.result.value;
    } catch (e) {}
  }
  return { error: "Context failed" };
}

/**
 * Stop Generation
 */
export async function stopGeneration(
  cdp: CDPConnection,
): Promise<ActionResult> {
  const EXP = `(async () => {
        const cancel = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancel && cancel.offsetParent !== null) {
            cancel.click();
            return { success: true };
        }
        
        const stopBtn = document.querySelector('button svg.lucide-square')?.closest('button');
        if (stopBtn && stopBtn.offsetParent !== null) {
            stopBtn.click();
            return { success: true, method: 'fallback_square' };
        }

        return { error: 'No active generation found to stop' };
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXP,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });
      if (res.result?.value) return res.result.value;
    } catch (e) {}
  }
  return { error: "Context failed" };
}

/**
 * Remote Click
 */
export async function clickElement(
  cdp: CDPConnection,
  { selector, index, textContent }: ClickParams,
): Promise<ActionResult> {
  const EXP = `(async () => {
        try {
            let elements = Array.from(document.querySelectorAll('${selector}'));
            if ('${textContent}') {
                elements = elements.filter(el => el.textContent?.includes('${textContent}'));
            }

            const target = elements[${index}];
            if (target) {
                target.click();
                return { success: true };
            }
            return { error: 'Element not found' };
        } catch(e) {
            return { error: e.toString() };
        }
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXP,
        scrollIntoView: true,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });
      if (res.result?.value?.success) return res.result.value;
    } catch (e) {}
  }
  return { error: "Click failed" };
}

/**
 * Remote Scroll
 */
export async function remoteScroll(
  cdp: CDPConnection,
  { scrollTop, scrollPercent }: ScrollParams,
): Promise<ActionResult> {
  const EXPRESSION = `(async () => {
        try {
            const cascade = document.getElementById('cascade');
            if (!cascade) return { error: 'Cascade not found' };

            // Use exact same selector logic as snapshot.ts
            const target = cascade.querySelector('.overflow-y-auto, [data-scroll-area]') || cascade;
            
            const oldScroll = target.scrollTop;
            let newScroll = 0;

            if (${scrollPercent} !== undefined) {
                newScroll = (target.scrollHeight - target.clientHeight) * ${scrollPercent};
                target.scrollTop = newScroll;
            } else {
                newScroll = ${scrollTop || 0};
                target.scrollTop = newScroll;
            }
            
            return { 
                success: true, 
                debug: {
                    targetTag: target.tagName,
                    scrollHeight: target.scrollHeight,
                    clientHeight: target.clientHeight,
                    oldScroll: oldScroll,
                    newScroll: newScroll,
                    actualScroll: target.scrollTop,
                    percent: ${scrollPercent}
                }
            };
        } catch(e) {
            return { error: e.toString() };
        }
    })()`;

  const errors: string[] = [];

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXPRESSION,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });

      if (res.result?.value?.success) return res.result.value;

      // Capture failure reason if available
      if (res.result?.value?.error) {
        errors.push(`Context ${ctx.id}: ${res.result.value.error}`);
      } else if (res.exceptionDetails) {
        errors.push(
          `Context ${ctx.id} Exception: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ""}`,
        );
      } else {
        errors.push(
          `Context ${ctx.id}: Unknown failure (Result: ${JSON.stringify(res.result)})`,
        );
      }
    } catch (e: any) {
      errors.push(`Context ${ctx.id} Exception: ${e.message}`);
    }
  }
  return { error: "Scroll failed", details: errors };
}

/**
 * Set AI Model
 */
export async function setModel(
  cdp: CDPConnection,
  modelName: string,
): Promise<ActionResult> {
  const EXP = `(async () => {
        try {
            const KNOWN_KEYWORDS = ["Gemini", "Claude", "GPT", "Model"];
            const allEls = Array.from(document.querySelectorAll('*'));
            const candidates = allEls.filter(el => {
                if (el.children.length > 0) return false;
                const txt = el.textContent;
                return txt && KNOWN_KEYWORDS.some(k => txt.includes(k));
            });

            let modelBtn = null;
            for (const el of candidates) {
                let current = el;
                for (let i = 0; i < 5; i++) {
                    if (!current) break;
                    if (current.tagName === 'BUTTON' || window.getComputedStyle(current).cursor === 'pointer') {
                        if (current.querySelector('svg.lucide-chevron-up') || current.innerText.includes('Model')) {
                            modelBtn = current;
                            break;
                        }
                    }
                    current = current.parentElement;
                }
                if (modelBtn) break;
            }

            if (!modelBtn) return { error: 'Model button not found' };
            modelBtn.click();
            await new Promise(r => setTimeout(r, 600));

            const visibleDialog = Array.from(document.querySelectorAll('[role="dialog"], div'))
                .find(d => {
                    const style = window.getComputedStyle(d);
                    return d.offsetHeight > 0 && 
                           (style.position === 'absolute' || style.position === 'fixed') && 
                           d.innerText.includes('${modelName}') && 
                           !d.innerText.includes('Files With Changes');
                });

            if (!visibleDialog) return { error: 'Model list not opened' };

            const allDialogEls = Array.from(visibleDialog.querySelectorAll('*'));
            let target = allDialogEls.find(el => 
                el.children.length === 0 && el.textContent?.trim() === '${modelName}'
            );
            
            if (!target) {
                 target = allDialogEls.find(el => 
                    el.children.length === 0 && el.textContent?.includes('${modelName}')
                );
            }

            if (target) {
                target.click();
                await new Promise(r => setTimeout(r, 200));
                return { success: true };
            }
            return { error: 'Model not found' };
        } catch(err) {
            return { error: err.toString() };
        }
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXP,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });
      if (res.result?.value) return res.result.value;
    } catch (e) {}
  }
  return { error: "Context failed" };
}

/**
 * Get App State
 */
export async function getAppState(cdp: CDPConnection): Promise<AppState> {
  const EXP = `(async () => {
        try {
            const state = { mode: 'Unknown', model: 'Unknown' };
            const allEls = Array.from(document.querySelectorAll('*'));
            
            for (const el of allEls) {
                if (el.children.length > 0) continue;
                const text = (el.innerText || '').trim();
                if (text !== 'Fast' && text !== 'Planning') continue;
                
                let current = el;
                for (let i = 0; i < 5; i++) {
                    if (!current) break;
                    const style = window.getComputedStyle(current);
                    if (style.cursor === 'pointer' || current.tagName === 'BUTTON') {
                        state.mode = text;
                        break;
                    }
                    current = current.parentElement;
                }
                if (state.mode !== 'Unknown') break;
            }
            
            if (state.mode === 'Unknown') {
                const textNodes = allEls.filter(el => el.children.length === 0 && el.innerText);
                if (textNodes.some(el => el.innerText.trim() === 'Planning')) state.mode = 'Planning';
                else if (textNodes.some(el => el.innerText.trim() === 'Fast')) state.mode = 'Fast';
            }

            const KNOWN_MODELS = ["Gemini", "Claude", "GPT"];
            const textNodes = allEls.filter(el => el.children.length === 0 && el.innerText);
            const modelEl = textNodes.find(el => {
                const txt = el.innerText;
                return KNOWN_MODELS.some(k => txt.includes(k)) && 
                       el.closest('button')?.querySelector('svg.lucide-chevron-up');
            });
            
            if (modelEl) state.model = modelEl.innerText.trim();
            
            return state;
        } catch(e) { return { error: e.toString() }; }
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const res = await cdp.call("Runtime.evaluate", {
        expression: EXP,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });
      if (res.result?.value) return res.result.value;
    } catch (e) {}
  }
  return { mode: "Unknown", model: "Unknown", error: "Context failed" };
}
