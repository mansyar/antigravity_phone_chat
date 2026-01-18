import os from "os";

/**
 * Get local IP address for mobile access
 * Prefers real network IPs over virtual adapters
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  const candidates: { address: string; name: string; priority: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        candidates.push({
          address: iface.address,
          name: name,
          // Prioritize common home/office network ranges
          priority: iface.address.startsWith("192.168.")
            ? 1
            : iface.address.startsWith("10.")
              ? 2
              : iface.address.startsWith("172.")
                ? 3
                : 4,
        });
      }
    }
  }

  // Sort by priority
  candidates.sort((a, b) => a.priority - b.priority);

  // If strict mode or just returning best match
  return candidates.length > 0 ? candidates[0].address : "localhost";
}

/**
 * Get all available local IPs with labels
 */
export function getNetworkInterfaces(): {
  name: string;
  address: string;
  type: string;
}[] {
  const interfaces = os.networkInterfaces();
  const results: { name: string; address: string; type: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        let type = "LAN";
        if (
          iface.address.startsWith("100.") ||
          name.toLowerCase().includes("tailscale")
        ) {
          type = "Tailscale";
        } else if (iface.address.startsWith("10.")) {
          type = "Private (10.x)";
        }
        results.push({ name, address: iface.address, type });
      }
    }
  }
  return results.sort((a, b) => (a.type === "Tailscale" ? -1 : 1));
}

/**
 * Simple hash function for content change detection
 */
export function hashString(str: string): string {
  if (!str) return "0";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
