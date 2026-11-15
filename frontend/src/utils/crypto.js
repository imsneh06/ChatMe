// Client-Side End-to-End Encryption (E2EE) using native Web Crypto API (ECDH P-256 + AES-GCM-256)

const sharedKeyCache = new Map();

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Initializes or retrieves existing ECDH key pair for the logged-in user.
 * Private key stays stored strictly on client. Public key is returned for syncing to server.
 */
export async function getOrGenerateUserKeyPair(userId) {
  if (!window.crypto?.subtle || !userId) return null;

  const storageKey = `chatme_e2ee_priv_${userId}`;
  const pubStorageKey = `chatme_e2ee_pub_${userId}`;

  try {
    const savedPriv = localStorage.getItem(storageKey);
    const savedPub = localStorage.getItem(pubStorageKey);

    if (savedPriv && savedPub) {
      return {
        privateKeyJwk: JSON.parse(savedPriv),
        publicKeyJwk: JSON.parse(savedPub),
      };
    }

    // Generate new ECDH P-256 key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    localStorage.setItem(storageKey, JSON.stringify(privateKeyJwk));
    localStorage.setItem(pubStorageKey, JSON.stringify(publicKeyJwk));

    return { privateKeyJwk, publicKeyJwk };
  } catch (err) {
    console.error("E2EE key generation error:", err);
    return null;
  }
}

/**
 * Derives a shared AES-GCM key from local private key and peer's public key.
 */
async function getSharedKey(myPrivateKeyJwk, peerPublicKeyJwk) {
  const cacheKey = `${JSON.stringify(myPrivateKeyJwk.x)}_${JSON.stringify(peerPublicKeyJwk.x)}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey);
  }

  const myPrivateKey = await window.crypto.subtle.importKey(
    "jwk",
    myPrivateKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );

  const peerPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    peerPublicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey,
    },
    myPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  sharedKeyCache.set(cacheKey, sharedKey);
  return sharedKey;
}

/**
 * Encrypts a plaintext message. Returns formatted string 'E2EE::<iv_hex>::<b64Cipher>'
 */
export async function encryptE2EEMessage(plainText, myPrivateKeyJwk, peerPublicKeyJwk) {
  if (!plainText || !myPrivateKeyJwk || !peerPublicKeyJwk) {
    return plainText;
  }

  try {
    const sharedKey = await getSharedKey(myPrivateKeyJwk, peerPublicKeyJwk);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plainText);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      encoded
    );

    const ivHex = bufferToHex(iv);
    const cipherB64 = arrayBufferToBase64(ciphertext);
    return `E2EE::${ivHex}::${cipherB64}`;
  } catch (err) {
    console.error("Encryption failed, falling back to plaintext:", err);
    return plainText;
  }
}

/**
 * Decrypts an E2EE payload. If not an encrypted string or decryption fails, returns original text.
 */
export async function decryptE2EEMessage(payload, myPrivateKeyJwk, peerPublicKeyJwk) {
  if (typeof payload !== "string" || !payload.startsWith("E2EE::")) {
    return payload;
  }

  if (!myPrivateKeyJwk || !peerPublicKeyJwk) {
    return payload;
  }

  try {
    const parts = payload.split("::");
    if (parts.length !== 3) return payload;

    const iv = hexToBuffer(parts[1]);
    const ciphertext = base64ToArrayBuffer(parts[2]);

    const sharedKey = await getSharedKey(myPrivateKeyJwk, peerPublicKeyJwk);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn("Could not decrypt message (different keys or modified content):", err.message);
    return payload;
  }
}
