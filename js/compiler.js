/**
 * MimaCompiler - LLMimi Studio Core Compiler
 * アセンブリ風のテキストを .mimi 形式の16進数データに変換します
 */
class MimaCompiler {
    /**
     * 値を解析する (10進数, 16進数, 相対指定, 特殊キーワードに対応)
     * ★修正: A-Fを含む文字列は自動的に16進数として扱うように改良
     */
    parseVal(val, currentPos = 0) {
        if (!val) return 0;
        val = val.trim();
        
        // "next" キーワード
        if (val.toLowerCase() === "next") return currentPos;

        let result = 0;

        // "+" で始まる場合: 相対位置
        if (val.startsWith('+')) {
            const numPart = val.substring(1);
            // 再帰的に値を解決して加算
            const offset = this.parseInternal(numPart);
            result = currentPos + offset;
        } else {
            result = this.parseInternal(val);
        }

        return isNaN(result) ? 0 : result;
    }

    /**
     * 数値変換のコアロジック
     */
    parseInternal(str) {
        if (!str) return 0;
        
        // 1. 明示的な16進数 (0x始まり)
        if (str.toLowerCase().startsWith('0x')) {
            return parseInt(str, 16);
        }

        // 2. 暗黙的な16進数 (A-Fが含まれている場合)
        // 例: "FF", "0C", "3c" -> これらは10進数ではありえないのでHex扱いする
        if (/[a-fA-F]/.test(str)) {
            return parseInt(str, 16);
        }

        // 3. それ以外は10進数として試す
        // 例: "255", "10"
        const dec = parseInt(str, 10);
        
        // もし10進数変換で NaN になった場合 (例: "A" だけ入力など)、16進数として救済を試みる
        if (isNaN(dec)) {
            return parseInt(str, 16);
        }

        return dec;
    }

    /**
     * 数値を指定した桁数の16進数文字列に変換する
     */
    toHex(num, digits) {
        if (num === undefined || num === null || isNaN(num)) {
            num = 0;
        }
        const val = Math.max(0, Math.floor(num));
        return val.toString(16).toUpperCase().padStart(digits, '0');
    }

    /**
     * コンパイル実行
     */
    compile(mainText, tracksData, fps, bpm, title) {
        const safeFps = parseInt(fps) || 24;
        const safeBpm = parseInt(bpm) || 120;
        const framesPerBeat = Math.round((60 / safeBpm) * safeFps);
        
        let result = `# Mimi Music Format v2.0\n`;
        result += `# Title: ${title}\n`;
        result += `# Config: ${safeBpm}BPM, ${safeFps}FPS (1beat=${framesPerBeat}f)\n`;
        result += `# Format: Type, Pitch, Length, Start, Volume, Pan\n\n`;

        const lines = mainText.split('\n');
        let currentCursor = 0;

        lines.forEach((line, index) => {
            const l = line.trim();
            if (!l || l.startsWith('#')) return;
            if (l.startsWith('@')) {
                result += l.substring(1).trim() + "\n";
                return; 
            }

            const parts = l.split(',').map(s => s.trim());
            if (parts.length < 2) return;

            const tId = parts[0];
            const tStartStr = parts[1];
            
            const tPitchOff = this.parseVal(parts[2] || "0");
            const tVolBase = this.parseVal(parts[3] || "255");
            const tPanBase = this.parseVal(parts[4] || "128");

            const trackContent = tracksData[tId];
            if (trackContent === undefined) {
                console.warn(`Warning: Track ${tId} not found`);
                return;
            }

            const baseStart = this.parseVal(tStartStr, currentCursor);
            let maxTrackDuration = 0;

            trackContent.split('\n').forEach(noteLine => {
                const nl = noteLine.split('#')[0].trim();
                if (!nl) return;

                const cols = nl.split(',').map(s => s.trim());
                if (cols.length < 4) return; // Type, Pitch, Len, Start は必須

                // --- ここから各値のパース ---
                
                const typeVal = this.parseVal(cols[0]); // "0C" -> 12
                
                // 特殊タイプ 0F (Hex PCM)
                if (typeVal === 0x0F) {
                    const pcmStart = this.parseVal(cols[1]) + baseStart;
                    const pcmData = cols[2] || "8";
                    result += `0F, ${this.toHex(pcmStart, 8)}, ${pcmData}\n`;
                    return;
                }

                const type = this.toHex(typeVal, 2);
                
                // Pitch: "3C" -> 60 + offset
                const pitchVal = this.parseVal(cols[1]) + tPitchOff;
                const pitch = this.toHex(pitchVal, 2);
                
                // Len, Start
                const lVal = this.parseVal(cols[2]);
                const sVal = this.parseVal(cols[3]);
                const len = this.toHex(lVal, 4);
                const start = this.toHex(sVal + baseStart, 8);
                
                // Volume: "FF" -> 255
                const noteVol = this.parseVal(cols[4] || "255");
                // ベース音量との掛け合わせ
                const finalVol = Math.floor(noteVol * (tVolBase / 255));
                const vol = this.toHex(finalVol, 2);

                const panVal = cols[5] !== undefined ? this.parseVal(cols[5]) : tPanBase;
                const pan = this.toHex(panVal, 2);

                // Attack / Release / Slide
                let extra = "";
                if (cols.length > 6) {
                    const atk = this.toHex(this.parseVal(cols[6] || "1"), 2);
                    const rel = this.toHex(this.parseVal(cols[7] || "1"), 2);
                    extra = `, ${atk}, ${rel}`;
                    
                    if (noteLine.includes(';')) {
                        const slidePart = noteLine.split(';')[1].trim();
                        const slideVal = this.parseVal(slidePart);
                        if (slideVal > 0) {
                             extra += ` ; ${this.toHex(slideVal, 2)}`;
                        }
                    }
                }

                result += `${type}, ${pitch}, ${len}, ${start}, ${vol}, ${pan}${extra}\n`;
                maxTrackDuration = Math.max(maxTrackDuration, sVal + lVal);
            });

            currentCursor = baseStart + maxTrackDuration;
        });

        return result;
    }
}