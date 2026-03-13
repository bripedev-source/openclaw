

# Building ITACHI: A Complete Technical Blueprint for Local-First AI on Android

**ITACHI is technically feasible** with current open-source technologies. The core AI system using Microsoft BitNet b1.58 2B4T requires only **0.4GB RAM** for inference—making it viable on most modern Android devices. The complete privacy suite leveraging VPN-based tracker blocking, k-anonymity breach checking, and hardware-backed encryption can be implemented without root access on Android 14+. However, the proposed multi-fingerprint authentication and biometric-to-blockchain-key derivation face fundamental Android platform limitations that require architectural workarounds. This report provides implementation guidance for all 20 feature requirements.

---

## On-device LLM: BitNet delivers exceptional mobile efficiency

Microsoft's **BitNet b1.58 2B4T** represents a breakthrough for mobile AI. This 2.4B parameter model uses ternary weights (-1, 0, +1) requiring only **0.4GB memory**—compared to 2GB+ for equivalent standard models. The efficiency gains are substantial: **1.37-5x faster inference** and **55-70% energy reduction** on ARM processors.

**Critical implementation detail**: BitNet requires `bitnet.cpp` (not standard llama.cpp) to achieve efficiency benefits. The build process involves:

```bash
git clone --recursive https://github.com/microsoft/BitNet.git
pip install -r requirements.txt
python setup_env.py -md models/BitNet-b1.58-2B-4T -q i2_s
```

For Termux deployment, compile llama.cpp directly with `pkg install clang cmake git`, then build with `cmake -B build && cmake --build build`. [GitHub]
(https://gist.github.com/EnigmaCurry/747f3da8a8e8d62fa7849f1beae5c307) The server mode (`llama-server -m model.gguf --host 127.0.0.1`) exposes an OpenAI-compatible API at localhost:8080 for Flutter integration.

**Model recommendations by device RAM**:
| RAM | Primary Model | Backup Option |
|----|--------------|--------------|
| 4GB | BitNet b1.58 2B4T | Qwen2.5-0.5B |
| 6GB | Qwen2.5-1.5B-Instruct | Gemma 2B |
| 8GB+ | Phi-3-mini (3.8B) | Llama 3.2 3B |



Performance benchmarks show **8-12 tokens/second** on Snapdragon 8 Gen 2+ devices with 3B models—sufficient for real-time text generation at human reading speed.

---

## NotebookLM-style knowledge synthesis through local RAG

Implementing NotebookLM functionality locally requires a three-layer architecture: **document processing**, **semantic retrieval**, and **generation synthesis**.

The document pipeline should chunk text into 256-512 token segments [Medium] (https://devendrayadav2494.medium.com/chunking-embeddings-for-rag-building-smarter-ai-chatbots-28c83ce5fe58) using recursive splitting (prioritizing paragraph → sentence → word boundaries), then embed with **all-MiniLM-L6-v2** (80MB model, excellent quality-to-size ratio). Store vectors in a SQLite-backed Chroma instance [IBM](https://www.ibm.com/think/tutorials/chunking-strategies-for-rag-with-langchain-watsonx-ai) or FAISS with memory mapping.

**Mind map generation** follows this flow: extract entities via LLM prompting → cluster by semantic similarity → build hierarchical structure → identify cross-branch relationships. The `graphview` Flutter package supports multiple layout algorithms including dedicated MindMap mode with expand/collapse animations. [Pub.dev](https://pub.dev/packages/graphview)

For agentic capabilities, implement the **ReAct pattern** (Reasoning + Acting) [Capabl] (https://capabl.in/blog/agentic-ai-design-patterns-react-rewoo-codeact-and-beyond) with structured output prompting. Small models under 3B parameters struggle with free-form function calling, [BentoML] (https://www.bentoml.com/blog/the-best-open-source-small-language-models) but grammar-constrained generation using llama.cpp's GBNF format forces valid JSON tool responses:

```python
```

```
```python
```

```
```

```
```

```
```

```
```

```
```

```
```

```

```
```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```

```





---

## Tracker blocking without root uses local VPN interception

The **VpnService API** creates a virtual TUN interface intercepting all device traffic without root access. This is the foundation for NetGuard, TrackerControl, and RethinkDNS. [GitHub]
(https://github.com/M66B/NetGuard/blob/master/README.md)

**Implementation architecture**:

1. `VpnService.Builder` creates local interface at 192.168.x.x
2. `addRoute("0.0.0.0", 0)` captures all IPv4 traffic
3. Parse DNS queries from raw packets
4. Check domain against blocklist (HashMap or Trie for O(1) lookup)
5. Return NXDOMAIN for blocked domains; forward others normally

**Android 14+ requires explicit foreground service types**. Declare in manifest:
```xml
<service android:name=".VpnService"
 android:foregroundServiceType="specialUse"
 android:permission="android.permission.BIND_VPN_SERVICE">
 <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
 android:value="VPN tunnel for privacy protection"></property>
</service>
```

Request battery optimization exemption programmatically—VPN apps qualify under Google Play policy when core functionality requires continuous operation. Support Android's Always-On VPN via `<meta-data android:name="android.net.VpnService.SUPPORTS_ALWAYS_ON" android:value="true"/>`.

**Blocklist sources**: Combine Steven Black's unified hosts (~130K domains), Disconnect tracker list (used by Firefox), and Exodus Privacy signatures for app-specific trackers. [GitHub]
(https://github.com/TrackerControl/tracker-control-android/blob/master/README.md) Update weekly via WorkManager background tasks.

**Key limitation**: Only one VPN can be active simultaneously—users running commercial VPNs cannot use local VPN filtering. GitHub offer DNS-over-HTTPS fallback (Android 9+ Private DNS) pointing to AdGuard or NextDNS.

---

## Dark web monitoring with privacy-preserving k-anonymity

The **Have I Been Pwned Pwned Passwords API is free and unlimited**—the most important finding for breach detection. It uses k-anonymity: send only the first 5 characters of a SHA-1 password hash, receive ~478 matching suffixes, check locally if full hash exists. Password passwork.pro/blog/private-password-breach-checking/) haveibeenpwned.

```julia
```
javascript
async function checkPassword(password) {
const hash = sha1(password).toUpperCase();
const prefix = hash.substring(0, 5);
const response = await fetch('https://api.pwnedpasswords.com/range/${prefix});
const hashes = (await response.text()).split('\n');
return hashes.some(line =&gt; line.startsWith(hash.substring(5)));
}
```

**Email breach checking** requires paid HIBP API haveibeenpwned (haveibeenpwned.com/api/v3) ($4.50-$326/month depending on rate limits). Proxy through a backend server to protect API keys—the app sends SHA-256 hashed emails, the server maps to actual emails for API queries.

**Alternative breach databases**:

| Service | Records | Pricing | Best For |

| DeHashed | 13B+ | ~$0.02/query | OSINT research |

| Intelligence X | 200B+ | €50+/month | Deep web coverage |

| SpyCloud | 36B+ | Enterprise | Stealer log detection |

For fully offline breach checking, download the complete Pwned Passwords database (~30GB SHA-1 hashes) using the official PwnedPasswordsDownloader tool. Store as a Bloom filter (3.5GB, 99.9% accuracy) for memory-efficient local lookup. GitHub.

---

## Password manager architecture with hardware-backed encryption

The **KDBX 4.1 format** (KeePassXC standard) provides a battle-tested architecture: Argon2id key derivation → AES-256-GCM or ChaCha20-Poly1305 encryption → HMAC-SHA256 authentication.

**Recommended Argon2id parameters for mobile**:

- Memory: 64MB (iOS autofill breaks above this)
- Iterations: 1-3

- Parallelism: 4 threads
- Output: 256-bit key

For TOTP/HOTP, implement RFC 6238/4226 directly—the algorithm is straightforward HMAC-SHA1 over a counter (time-based or event-based). Store OTP secrets in a **separate encrypted database** from passwords to maintain 2FA security if password database is compromised.

**Android Keystore integration** provides hardware-backed key protection:
```kotlin
KeyGenParameterSpec.Builder("vault_key", PURPOSE_ENCRYPT or PURPOSE_DECRYPT)
.setBlockModes(BLOCK_MODE_GCM)
.setEncryptionPaddings(ENCRYPTION_PADDING_NONE)
.setUserAuthenticationRequired(true) // Requires biometric/PIN
.setInvalidatedByBiometricEnrollment(true) // Detect new fingerprints
.setIsStrongBoxBacked(true) // Use dedicated secure processor
.build()
```

The **CryptoObject** binding with BiometricPrompt ensures the encryption key is only accessible after successful biometric authentication—preventing bypass attacks.

---

## Multi-fingerprint authentication faces platform limitations

**Android BiometricPrompt cannot distinguish between enrolled fingerprints.** The API returns only success/failure—no fingerprint identifier, no template access. This is a security design: preventing fingerprint harvesting by malicious apps.

**Workaround architectures**:

1. **Sequential authentication with time windows**: Require 3 successful authentications within 10 seconds, with visual indicators for which "slot" is being verified. Each authentication unlocks a different Keystore key; combine all 3 keys to derive the final decryption key.
2. **Multi-factor layering**: Fingerprint + PIN pattern + knowledge question, where the combination is treated as the "3-factor" equivalent.
3. **External hardware** (not recommended): USB fingerprint scanners with custom SDKs can provide template access, but require rooted devices and raise compliance concerns.

**Biometric-to-cryptographic-key derivation** (fuzzy extractors) is theoretically possible but impractical on Android. The TEE never exposes raw biometric data—templates are encrypted with device-specific keys and never leave secure hardware. Recent research achieved 105-bit security with iris biometrics using fuzzy extractors, IACR but this required direct sensor access unavailable on standard Android.

The practical approach: use BiometricPrompt to unlock Android Keystore keys, which then decrypt application-level secrets. This provides hardware-backed security without raw biometric access.

---

## Blockchain identity works best with offline-first DID methods

Running full blockchain nodes on mobile is impractical. Instead, use **did:peer** for offline peer-to-peer identity and **did:key** for ephemeral identities, with optional on-chain anchoring for revocation checking.

**Recommended identity stack**:

- **DID Method**: did:peer:4 (supports multiple verification methods, fully offline)
- **Credentials**: W3C Verifiable Credentials Data Model
- **ZK Proofs**: Groth16 (zk-SNARK) via Polygon ID SDK—proof generation takes &lt;1 second on modern devices
- **SDK**: Polygon ID Flutter SDK provides complete DID/VC/ZKP functionality

**Zero-knowledge proofs for biometric verification** are feasible using Semaphore protocol or Polygon ID circuits. Rather than proving "this is my fingerprint," prove "I possess a credential attesting to successful biometric verification" without revealing the biometric itself.

**Architecture for biometric-blockchain binding**:

1. User authenticates via BiometricPrompt
2. Successful auth unlocks Keystore-stored DID private key
3. DID signs attestation: "Holder authenticated via Class 3 biometric at timestamp T"
4. ZKP proves possession of valid attestation without revealing DID or timestamp

This provides verifiable biometric authentication claims without exposing raw biometric data or requiring on-chain biometric storage.

---

## End-to-end encryption should use Signal Protocol with post-quantum hybrid



**Signal Protocol** (Double Ratchet + X3DH/PQXDH) provides the strongest security guarantees for messaging. The **libsignal** library is production-ready but AGPL-3.0 licensed—requiring open-sourcing modifications.

For file sharing, implement **capability-based URLs**:

```

https://app.example/file/{id}#{base64_key}
```

The key in the URL fragment never reaches the server (browsers don't send fragments). The server stores only encrypted blobs; recipients extract keys client-side.

**Government-resistant encryption stack**:

| Layer | Algorithm | Purpose |

|-------|-----------|---------|

| Symmetric | AES-256-GCM | Message/file encryption |

| Key Exchange | X25519 + ML-KEM-768 (hybrid) | Post-quantum protection |

| Signatures | Ed25519 + ML-DSA | Authentication |

| KDF | Argon2id | Password-based keys |

| KDF | HKDF-SHA256 | Key derivation |

**NIST standardized post-quantum algorithms** (August 2024): ML-KEM (Kyber) for key encapsulation, ML-DSA (Dilithium) for signatures. Implement hybrid schemes combining classical (X25519) and post-quantum (Kyber-768) key exchange—if either breaks, the other still protects.

**Metadata protection** options:

- Message padding to fixed sizes (256B, 1KB, 4KB buckets)

- Cover traffic (dummy messages at random intervals)

- Optional Tor integration via Orbot (significant latency impact)

- Signal's Sealed Sender pattern (server sees recipient but not sender)

Matrix Protocol with **vodozemac** (Apache-2.0 licensed, Rust implementation) offers more permissive licensing but weaker metadata protection than Signal.

---

## Flutter architecture for modular security features

**Clean Architecture with feature-first organization** supports 10+ independent modules:

```

lib/



┌── core/ # Shared: encryption, network, DI

┌── features/

│ ├── auth/ # Biometric unlock

│ ├── vault/ # Password manager

│ ├── ai_assistant/ # LLM integration

│ ├── knowledge_graph/ # Mind maps

│ ├── tracker_blocker/ # VPN service

│ └── secure_share/ # E2E file sharing

└── shared/ # Common widgets

```

**State management**: Riverpod 2.x with code generation provides compile-time safety and excellent testability. For stricter separation, BLoC remains the enterprise standard.

**Encrypted storage recommendation**:

1. **Keys**: `flutter_secure_storage` (Android Keystore backend) [Pub.dev]

(https://pub.dev/packages/flutter_secure_storage)

2. **Structured data**: Drift + SQLCipher (`sqlcipher_flutter_libs`) [LogRocket]

(https://blog.logrocket.com/securing-local-storage-flutter/)

3. **Documents**: Encrypted files in app-specific directory

**Native integration for llama.cpp**: Use `dart:ffi` with `ffigen` for type-safe C bindings. [Flutter]

(https://docs.flutter.dev/platform-integration/android/c-interop) [Flutter](https://docs.flutter.dev/platform-integration/ios/c-interop) The `llama_cpp_dart` package provides pre-built bindings. Run inference in Dart Isolates to avoid UI blocking.

**Background services**: Combine `workmanager` for periodic tasks (blocklist updates, breach checking) with `flutter_background_service` for continuous operation (VPN tunnel). [Pub.dev]

(https://pub.dev/packages/workmanager) Android 14+ requires explicit service type declarations.

---

## Essential Flutter packages by category

**Security & Storage**:

- `flutter_secure_storage: ^9.0.0` — Keystore/Keychain access
- `drift: ^2.15.0` + `sqlcipher_flutter_libs: ^0.6.1` — Encrypted SQLite
- `local_auth: ^2.2.0` — Biometric authentication
- `pointycastle: ^3.7.3` + `encrypt: ^5.0.3` — Cryptography

**AI & Knowledge**:



- `graphview: ^1.2.0` — Mind map visualization (MindMap algorithm)
- `fleather: ^1.26.0` — Rich text editor (Quill Delta format)
- `llama_cpp_dart: ^0.4.1` — LLM inference bindings
- `flutter_markdown: ^0.6.22` — Markdown rendering

**Native Integration**:
- `workmanager: ^0.5.2` — Background task scheduling
- `flutter_background_service: ^5.0.5` — Foreground services
- `mobile_scanner: ^4.0.1` — QR code scanning (OTP import)

---

## Termux integration enables powerful offline AI

Communication between Flutter and Termux uses three channels:

1. **RUN_COMMAND Intent**: Execute commands via `com.termux.RUN_COMMAND` action (requires `allow-external-apps=true` in `~/.termux/termux.properties`) [GitHub](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent)

2. **Shared storage**: `termux-setup-storage` links `~/storage/shared` to device storage for model file exchange [Code4Noobz](https://4noobz.net/local-ai-on-y-android-with-llama-cpp-and-termux/)

3. **Local HTTP**: Run `llama-server` on localhost:8080 for OpenAI-compatible API access

**Termux LLM setup**:
```bash
pkg update && pkg install clang cmake git
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
cmake -B build && cmake --build build --config Release
./build/bin/llama-server -m model.gguf --host 127.0.0.1 -c 4096
```

For GPU acceleration on Qualcomm devices, copy OpenCL libraries from `/vendor/lib64/` and build with `-DGGML_OPENCL=ON`. [GitHub](https://github.com/JackZeng0208/llama.cpp-android-tutorial)

**whisper.cpp** for speech recognition integrates similarly—the `whisper.android` example provides complete Kotlin JNI bindings. The `whisper_kit` Flutter package wraps this for offline transcription.

---



## Open source components to integrate versus build

| Component | Integrate | Build Custom | Rationale |

|----------|----------|------------|----------|

| LLM inference | llama.cpp (MIT) | — | Mature, excellent ARM support |

| Speech recognition | whisper.cpp (MIT) | — | Production-ready |

| Note storage format | — | Obsidian-style markdown | Avoid AGPL, maximum portability |

| Password format | KDBX 4.1 | — | Interoperable, well-documented |

| E2E encryption | Study Signal/Joplin | Custom implementation | Avoid AGPL license issues |

| Tracker blocking | Study TrackerControl | Custom VPN service | Complex VPN code requires customization |

| DID/VC | Polygon ID SDK | — | Complete Flutter support |

**Licensing considerations**: Joplin, Logseq, KeePassXC, and Bitwarden clients use GPL/AGPL—derivative works must be open-sourced. llama.cpp, whisper.cpp, MLC-LLM, and vodozemac use permissive MIT/Apache licenses allowing proprietary use.

---

## Feasibility assessment and implementation roadmap

| Feature | Feasibility | Complexity | Timeline |

|----------|------------|----------|----------|

| BitNet on-device LLM | ✅ High | Medium | 4-6 weeks |

| NotebookLM RAG/synthesis | ✅ High | High | 6-8 weeks |

| MCP-style agentic | ⚠️ Medium | High | 4-6 weeks |

| Tracker blocking (VPN) | ✅ High | High | 6-8 weeks |

| HIBP breach monitoring | ✅ High | Low | 2-3 weeks |

| Password manager | ✅ High | Medium | 4-6 weeks |

| TOTP aggregation | ✅ High | Low | 1-2 weeks |

| Multi-fingerprint auth | ⚠️ Limited | Medium | 2-3 weeks (workaround) |

| Biometric-to-key derivation | ❌ Not practical | N/A | Use Keystore binding instead |

| Blockchain DID | ✅ High | Medium | 4-6 weeks |

| ZKP biometric verification | ⚠️ Medium | High | 6-8 weeks |

| E2E encrypted sharing | ✅ High | High | 6-8 weeks |

| Post-quantum crypto | ✅ High | Medium | 2-4 weeks |

| Flutter architecture | ✅ High | Medium | Ongoing |

**Total estimated development**: 9-12 months for full feature set with a small team.

**Critical success factors**:

- Target devices with 6GB+ RAM for optimal LLM performance

- Implement Termux integration as optional enhancement (some users won't install)
- Prioritize offline-first: all core features must work without network
- Use hardware-backed security (Android Keystore, StrongBox) for all sensitive keys
- Provide clear user education on platform limitations (VPN exclusivity, biometric constraints)

---

## Conclusion

ITACHI represents an ambitious but achievable vision for local-first AI with comprehensive privacy protection. The technical foundation exists: BitNet enables efficient on-device inference, Android's VpnService provides tracker blocking without root, HIBP's k-anonymity API enables privacy-preserving breach detection, and mature cryptographic libraries support government-resistant encryption.

The primary architectural challenge is Android's biometric security model—designed to prevent exactly the fingerprint template access ITACHI envisions. The workaround (biometric-bound Keystore keys) provides equivalent security guarantees through a different mechanism.

For blockchain identity, skip full node operation entirely—offline DID methods (did:peer) combined with ZK proofs provide verifiable identity without continuous blockchain interaction.

The recommended implementation order: (1) encrypted storage foundation, (2) password manager with biometric unlock, (3) on-device LLM integration, (4) knowledge synthesis features, (5) tracker blocking, (6) breach monitoring, (7) E2E encrypted sharing, (8) DID/blockchain identity. This progression builds core security infrastructure before adding advanced features.