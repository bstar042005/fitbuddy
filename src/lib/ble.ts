"use client";
// Web Bluetooth link to the FitBuddy ESP32 module (Chrome / Edge / Android).
// The firmware exposes the Nordic UART Service: newline-delimited JSON
// messages are notified on TX, commands are written to RX.
//   device → app: {"t":"rep",...} {"t":"sed",...} {"t":"chl",...} {"t":"pos",...} {"t":"hello",...} {"t":"bat",...} {"t":"raw",...}
//   app → device: {"c":"cfg",...} {"c":"base",...} {"c":"calib",...} {"c":"hap",...} {"c":"rec",...} {"c":"live",...}

export const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app writes
const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // device notifies

export type DeviceMessage = Record<string, any> & { t: string };

export function bleSupported() {
  return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
}

export class FitBuddyBle {
  private device: any = null;
  private rx: any = null;
  private buffer = "";
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private onMessage: (m: DeviceMessage) => void,
    private onDisconnect: () => void
  ) {}

  get name(): string {
    return this.device?.name ?? "FitBuddy";
  }

  async connect() {
    if (!bleSupported()) throw new Error("Web Bluetooth isn't available — use Chrome or Edge on desktop/Android.");
    this.device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ namePrefix: "FitBuddy" }],
      optionalServices: [NUS_SERVICE],
    });
    this.device.addEventListener("gattserverdisconnected", () => this.onDisconnect());
    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(NUS_SERVICE);
    this.rx = await service.getCharacteristic(NUS_RX);
    const tx = await service.getCharacteristic(NUS_TX);
    tx.addEventListener("characteristicvaluechanged", (e: any) => this.onChunk(e.target.value as DataView));
    await tx.startNotifications();
  }

  private onChunk(view: DataView) {
    this.buffer += new TextDecoder().decode(view);
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg && typeof msg.t === "string") this.onMessage(msg);
      } catch {
        console.warn("FitBuddy BLE: bad line", line);
      }
    }
    if (this.buffer.length > 2048) this.buffer = ""; // runaway guard
  }

  // Commands are serialised and split into 180-byte writes (safe for most MTUs).
  send(cmd: Record<string, unknown>) {
    if (!this.rx) return Promise.resolve();
    const bytes = new TextEncoder().encode(JSON.stringify(cmd) + "\n");
    this.queue = this.queue.then(async () => {
      for (let i = 0; i < bytes.length; i += 180) {
        await this.rx.writeValueWithResponse(bytes.slice(i, i + 180));
      }
    }).catch((e) => console.warn("FitBuddy BLE write failed", e));
    return this.queue;
  }

  disconnect() {
    try {
      this.device?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
  }
}
