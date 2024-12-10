export class NextStateStorage<T> {
  private storage: "localStorage" | "sessionStorage" | "indexedDB";
  private key: string;
  private version: number;

  constructor(options: NextStateConfig<T>["options"]["persist"]) {
    this.storage = options?.storage || "localStorage";
    this.key = options?.key || "next-state";
    this.version = options?.version || 1;
  }

  async get(): Promise<T | null> {
    try {
      if (this.storage === "indexedDB") {
        return await this.getFromIndexedDB();
      }

      const saved = window[this.storage].getItem(this.key);
      if (!saved) return null;

      const { version, data } = JSON.parse(saved);
      if (version !== this.version) {
        // Handle migration if needed
        return null;
      }

      return data;
    } catch (error) {
      throw new Error(`Storage Error: ${error}`);
    }
  }

  private async getFromIndexedDB(): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.key, this.version);

      request.onerror = () => reject(new Error("IndexedDB access denied"));
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["state"], "readonly");
        const objectStore = transaction.objectStore("state");
        const getRequest = objectStore.get("current");

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(new Error("Failed to read state"));
      };
    });
  }
}
