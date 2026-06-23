import html2canvas from 'html2canvas';

let tempCtx: CanvasRenderingContext2D | null = null;

function getSafeColor(colorStr: string): string {
  if (!colorStr) return colorStr;

  const hasUnsupportedColor = 
    colorStr.includes('oklch') || 
    colorStr.includes('oklab') || 
    colorStr.includes('oklsh') || 
    colorStr.includes('color-mix') || 
    colorStr.includes('light-dark');

  if (!hasUnsupportedColor) return colorStr;

  if (!tempCtx) {
    try {
      tempCtx = document.createElement('canvas').getContext('2d');
    } catch (e) {
      // Fallback context creation failure
    }
  }

  const prefixes = ['oklch', 'oklab', 'oklsh', 'color-mix', 'light-dark'];
  let result = colorStr;

  for (const prefix of prefixes) {
    let index = 0;
    while ((index = result.indexOf(prefix + '(')) !== -1) {
      let openBrackets = 1;
      let i = index + prefix.length + 1;
      while (i < result.length && openBrackets > 0) {
        if (result[i] === '(') openBrackets++;
        else if (result[i] === ')') openBrackets--;
        i++;
      }
      
      const fullMatch = result.slice(index, i);
      let replaced = 'rgba(128, 128, 128, 0.5)'; // safe default fallback
      if (tempCtx) {
        tempCtx.fillStyle = 'rgb(0, 0, 0)'; // reset
        tempCtx.fillStyle = fullMatch;
        const converted = tempCtx.fillStyle;
        
        // If the browser native parser can resolve this structure to rgb/rgba/hex, return it
        const isResolved = converted && 
          !converted.includes('oklch') && 
          !converted.includes('oklab') && 
          !converted.includes('oklsh') && 
          !converted.includes('color-mix') && 
          !converted.includes('light-dark');

        if (isResolved) {
          replaced = converted;
        }
      }
      
      result = result.substring(0, index) + replaced + result.substring(i);
    }
  }

  return result;
}

export async function html2canvasPatched(element: HTMLElement, options: any): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;
  
  // Set up the proxy override on getComputedStyle during html2canvas execution
  window.getComputedStyle = function(el, pseudo) {
    const style = originalGetComputedStyle.call(window, el, pseudo);
    return new Proxy(style, {
      get(target, prop) {
        const val = target[prop as keyof typeof target];
        if (typeof val === 'function') {
          if (prop === 'getPropertyValue') {
            return function(key: string) {
              const originalVal = target.getPropertyValue(key);
              if (typeof originalVal === 'string') {
                const hasModernColor = originalVal.includes('oklch') || 
                                       originalVal.includes('oklab') || 
                                       originalVal.includes('oklsh') || 
                                       originalVal.includes('color-mix') || 
                                       originalVal.includes('light-dark');
                if (hasModernColor) {
                  return getSafeColor(originalVal);
                }
              }
              return originalVal;
            };
          }
          return val.bind(target);
        }
        if (typeof prop === 'string') {
          if (typeof val === 'string') {
            const hasModernColor = val.includes('oklch') || 
                                   val.includes('oklab') || 
                                   val.includes('oklsh') || 
                                   val.includes('color-mix') || 
                                   val.includes('light-dark');
            if (hasModernColor) {
              return getSafeColor(val);
            }
          }
        }
        return val;
      }
    }) as any;
  };

  try {
    return await html2canvas(element, options);
  } finally {
    // Restore window.getComputedStyle immediately to prevent affecting rest of application
    window.getComputedStyle = originalGetComputedStyle;
  }
}
