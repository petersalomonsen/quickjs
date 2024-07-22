function debug(...args) {
    // console.log('preparewasm', ...args);
}

export function prepareWASM(inputBytes) {
    const inputView = new DataView(inputBytes.buffer);
    const parts = [];

    const magic = new TextDecoder().decode(inputBytes.slice(0, 4));

    if (magic !== '\0asm') {
        throw new Error('Invalid magic number');
    }

    const version = inputView.getUint32(4, true);
    if (version != 1) {
        throw new Error('Invalid version: ' + version);
    }

    let offset = 8;
    parts.push(inputBytes.slice(0, offset));

    function decodeLEB128() {
        let result = 0;
        let shift = 0;
        let byte;
        do {
            byte = inputBytes[offset++];
            result |= (byte & 0x7f) << shift;
            shift += 7;
        } while (byte & 0x80);
        return result;
    }

    function decodeLimits() {
        const flags = inputBytes[offset++];
        const hasMax = flags & 0x1;
        const initial = decodeLEB128();
        const max = hasMax ? decodeLEB128() : null;
        return { initial, max };
    }

    function decodeString() {
        const length = decodeLEB128();
        const result = inputBytes.slice(offset, offset + length);
        offset += length;
        return new TextDecoder('utf8').decode(result);
    }

    function encodeLEB128(value) {
        const result = [];
        do {
            let byte = value & 0x7f;
            value >>= 7;
            if (value !== 0) {
                byte |= 0x80;
            }
            result.push(byte);
        } while (value !== 0);
        return new Uint8Array(result);
    }

    function encodeString(value) {
        const encoded = new TextEncoder().encode(value);
        return new Uint8Array([...encodeLEB128(encoded.length), ...encoded]);
    }

    function concatUint8Arrays(arrays) {
        let totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        let result = new Uint8Array(totalLength);
        let offset = 0;
        for (let arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    do {
        const sectionStart = offset;
        const sectionId = inputView.getUint8(offset);
        offset++;
        const sectionSize = decodeLEB128();
        const sectionEnd = offset + sectionSize;
        debug('section', sectionId, sectionStart, sectionSize);
        
        if (sectionId == 5) {
            // Memory section
            // Make sure it's empty and only imported memory is used
            parts.push(new Uint8Array([5, 1, 0]));
        } else if (sectionId == 2) {
            // Import section
            const sectionParts = [];
            const numImports = decodeLEB128();
            debug('numImports', numImports);
            for (let i = 0; i < numImports; i++) {
                const importStart = offset;
                const module = decodeString();
                const field = decodeString();
                const kind = inputView.getUint8(offset);
                debug('offset', offset.toString(16), 'kind', kind, 'module', module, 'field', field);
                offset++;
                
                let skipImport = false;
                switch (kind) {
                    case 0:
                        // Function import
                        decodeLEB128(); // index
                        break;
                    case 1:
                        // Table import
                        offset++; // type
                        decodeLimits();
                        break;
                    case 2:
                        // Memory import
                        decodeLimits();
                        // NOTE: existing memory import is removed (so no need to add it to sectionParts)
                        skipImport = true;
                        break;
                    case 3:
                        // Global import
                        offset++; // type
                        offset++; // mutability
                        break;
                    default:
                        throw new Error('Invalid import kind: ' + kind);
                }

                if (!skipImport) {
                    sectionParts.push(inputBytes.slice(importStart, offset));
                }
            }

            const importMemory = concatUint8Arrays([
                encodeString('env'),
                encodeString('memory'),
                new Uint8Array([2]), // Memory import
                // TODO: Check what values to use
                new Uint8Array([0]),
                encodeLEB128(1),
            ]);

            sectionParts.push(importMemory);

            const sectionData = concatUint8Arrays([
                encodeLEB128(sectionParts.length),
                ...sectionParts,
            ]);

            parts.push(concatUint8Arrays([
                new Uint8Array([2]), // Import section
                encodeLEB128(sectionData.length),
                sectionData
            ]));
        } else if (sectionId == 7) {
            // Export section
            const sectionParts = [];
            const numExports = decodeLEB128();
            debug('numExports', numExports);
            for (let i = 0; i < numExports; i++) {
                const exportStart = offset;
                const name = decodeString();
                const kind = inputView.getUint8(offset);
                offset++;
                const index = decodeLEB128();
                debug('kind', kind, 'name', name, 'index', index);
                if (kind !== 2) {
                    // Pass through all exports except memory
                    sectionParts.push(inputBytes.slice(exportStart, offset));
                }
            }

            const sectionData = concatUint8Arrays([
                encodeLEB128(sectionParts.length),
                ...sectionParts,
            ]);

            parts.push(concatUint8Arrays([
                new Uint8Array([7]), // Export section
                encodeLEB128(sectionData.length),
                sectionData
            ]));
        } else {
            parts.push(inputBytes.slice(sectionStart, sectionEnd));
        }

        offset = sectionEnd;
    } while (offset < inputBytes.length);

    return concatUint8Arrays(parts);
}
