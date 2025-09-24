const getGlobalCrypto = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof self !== "undefined" && self.crypto) {
    return self.crypto;
  }
  return undefined;
};

const byteToHex = Array.from({ length: 256 }, (_, index) =>
  index.toString(16).padStart(2, "0")
);

const bytesToUuid = (bytes) => {
  const segments = [
    byteToHex[bytes[0]] + byteToHex[bytes[1]] + byteToHex[bytes[2]] + byteToHex[bytes[3]],
    byteToHex[bytes[4]] + byteToHex[bytes[5]],
    byteToHex[bytes[6]] + byteToHex[bytes[7]],
    byteToHex[bytes[8]] + byteToHex[bytes[9]],
    byteToHex[bytes[10]] +
      byteToHex[bytes[11]] +
      byteToHex[bytes[12]] +
      byteToHex[bytes[13]] +
      byteToHex[bytes[14]] +
      byteToHex[bytes[15]],
  ];
  return segments.join("-");
};

const getRandomBytes = (length) => {
  const cryptoObj = getGlobalCrypto();
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const array = new Uint8Array(length);
    cryptoObj.getRandomValues(array);
    return array;
  }

  if (typeof Math.random === "function") {
    const array = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      array[index] = Math.floor(Math.random() * 256);
    }
    return array;
  }

  return null;
};

export const createProfileId = () => {
  const cryptoObj = getGlobalCrypto();
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `profile-${cryptoObj.randomUUID()}`;
  }

  const bytes = getRandomBytes(16);
  if (bytes) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return `profile-${bytesToUuid(bytes)}`;
  }

  const randomPart =
    typeof Math.random === "function" ? Math.random().toString(36).slice(2) : "fallback";
  return `profile-${Date.now()}-${randomPart}`;
};
