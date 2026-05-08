import "server-only";

/**
 * Lightweight UA parser — pure regex, sem dependências.
 *
 * Cobre ~95% dos UAs reais (Chrome, Safari, Firefox, Edge, Opera +
 * iOS/Android/Windows/macOS/Linux + iPhone/iPad/Samsung/Pixel/Xiaomi).
 *
 * Optei por inline em vez de ua-parser-js pra evitar conflito de versão
 * Zod com Next 14 internal vendoring (PR #34 incident). Trade-off: cobertura
 * menor que a lib, mas suficiente pra agregação por mercado BR.
 */

export type ParsedUA = {
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_vendor: string | null;
  device_model: string | null;
  device_type: "mobile" | "desktop" | "tablet" | "unknown";
};

function cap(s: string, max: number): string {
  return s.slice(0, max);
}

function parseBrowser(
  ua: string,
): { name: string | null; version: string | null } {
  // Edge primeiro porque UA tem "Edg/" + "Chrome/" — match na ordem.
  let m = ua.match(/Edg\/([\d.]+)/);
  if (m) return { name: "Edge", version: cap(m[1]!, 32) };
  m = ua.match(/OPR\/([\d.]+)|Opera\/([\d.]+)/);
  if (m) return { name: "Opera", version: cap(m[1] || m[2] || "", 32) };
  m = ua.match(/Chrome\/([\d.]+)/);
  if (m) return { name: "Chrome", version: cap(m[1]!, 32) };
  m = ua.match(/Firefox\/([\d.]+)/);
  if (m) return { name: "Firefox", version: cap(m[1]!, 32) };
  // Safari precisa "Version/X" e ausência de Chrome.
  m = ua.match(/Version\/([\d.]+).*Safari/);
  if (m) return { name: "Safari", version: cap(m[1]!, 32) };
  // Samsung Internet
  m = ua.match(/SamsungBrowser\/([\d.]+)/);
  if (m) return { name: "Samsung Internet", version: cap(m[1]!, 32) };
  return { name: null, version: null };
}

function parseOS(
  ua: string,
): { name: string | null; version: string | null } {
  // iOS antes de macOS porque iPad/iPhone trazem "Mac OS X" no UA.
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS (\d+[._]\d+(?:[._]\d+)?)/);
    return {
      name: "iOS",
      version: m ? cap(m[1]!.replace(/_/g, "."), 32) : null,
    };
  }
  // Android
  let m = ua.match(/Android (\d+(?:\.\d+)*)/);
  if (m) return { name: "Android", version: cap(m[1]!, 32) };
  // Windows — versão NT mapeada pra label humano.
  m = ua.match(/Windows NT (\d+\.\d+)/);
  if (m) {
    const v = m[1]!;
    const human: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    return { name: "Windows", version: human[v] ?? v };
  }
  // macOS
  m = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
  if (m) return { name: "macOS", version: cap(m[1]!.replace(/_/g, "."), 32) };
  // ChromeOS
  if (/CrOS/.test(ua)) return { name: "ChromeOS", version: null };
  // Linux genérico
  if (/Linux/.test(ua)) return { name: "Linux", version: null };
  return { name: null, version: null };
}

function parseDevice(ua: string): {
  vendor: string | null;
  model: string | null;
  type: ParsedUA["device_type"];
} {
  if (/iPad/.test(ua)) {
    return { vendor: "Apple", model: "iPad", type: "tablet" };
  }
  if (/iPhone/.test(ua)) {
    return { vendor: "Apple", model: "iPhone", type: "mobile" };
  }
  if (/iPod/.test(ua)) {
    return { vendor: "Apple", model: "iPod", type: "mobile" };
  }
  // Android: extrai modelo entre ";" e "Build" (UA Android comum:
  // "Mozilla/5.0 (Linux; Android 13; SM-G998B Build/...) ...")
  const androidModelMatch = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\s*[;)])/);
  if (androidModelMatch) {
    const model = cap(androidModelMatch[1]!.trim(), 128);
    let vendor: string | null = null;
    if (/^SM-|Galaxy|^GT-|^SC-/i.test(model)) vendor = "Samsung";
    else if (/^Pixel/i.test(model)) vendor = "Google";
    else if (/^MI |^Redmi|Xiaomi|^M\d{4}/i.test(model)) vendor = "Xiaomi";
    else if (/^Moto|^XT/i.test(model)) vendor = "Motorola";
    else if (/^LG|^LM-/i.test(model)) vendor = "LG";
    else if (/^OPPO|^CPH/i.test(model)) vendor = "Oppo";
    else if (/^vivo|^V\d{4}/i.test(model)) vendor = "Vivo";
    else if (/^HUAWEI|^Honor|^ANE/i.test(model)) vendor = "Huawei";
    else if (/^OnePlus/i.test(model)) vendor = "OnePlus";
    return { vendor, model, type: "mobile" };
  }
  if (/Android/.test(ua)) {
    return { vendor: null, model: null, type: "mobile" };
  }
  if (/Tablet|PlayBook|Silk|Kindle/.test(ua)) {
    return { vendor: null, model: null, type: "tablet" };
  }
  if (/Mobi|webOS|BlackBerry|IEMobile/.test(ua)) {
    return { vendor: null, model: null, type: "mobile" };
  }
  return { vendor: null, model: null, type: "desktop" };
}

export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) {
    return {
      browser_name: null,
      browser_version: null,
      os_name: null,
      os_version: null,
      device_vendor: null,
      device_model: null,
      device_type: "unknown",
    };
  }
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const device = parseDevice(ua);
  return {
    browser_name: browser.name,
    browser_version: browser.version,
    os_name: os.name,
    os_version: os.version,
    device_vendor: device.vendor,
    device_model: device.model,
    device_type: device.type,
  };
}
