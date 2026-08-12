import { app, type IpcMainInvokeEvent } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_IPC_PAYLOAD_BYTES = 32_000;
const DEV_ORIGIN = "http://127.0.0.1:5173";

function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (!app.isPackaged && url.origin === DEV_ORIGIN) {
      return process.env.VITE_DEV_SERVER_URL === DEV_ORIGIN;
    }
    if (url.protocol !== "file:") return false;
    const filePath = path.normalize(fileURLToPath(url));
    const expectedIndex = path.normalize(path.join(app.getAppPath(), "dist", "index.html"));
    return filePath === expectedIndex;
  } catch {
    return false;
  }
}

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url ?? event.sender.getURL();
  if (!isTrustedRendererUrl(senderUrl)) throw new Error("UNTRUSTED_IPC_SENDER");
}

export function assertPayloadSize(value: unknown): void {
  const bytes = Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  if (bytes > MAX_IPC_PAYLOAD_BYTES) throw new Error("INVALID_INPUT");
}

export async function withTimeout<T>(promise: Promise<T>, milliseconds = 30_000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("OPERATION_TIMEOUT")), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
