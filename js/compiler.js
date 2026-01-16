/**
 * MimaCompiler - LLMimi Studio Core Compiler
 * アセンブリ風のテキストを .mimi 形式の16進数データに変換します
 */

class MimaCompiler {
    /**
     * 値を解析する (10進数, 16進数, 相対指定, 特殊キーワードに対応)
     * @param {string} val - 解析する文字列
     * @param {number} currentPos - 現在のカーソル位置 (next用)
     */
    parseVal(val, currentPos = 0) {
        if (!val) return 0;
        val = val.trim().toLowerCase();
        
        // "next" キーワード: 前のトラックの終了位置を返す
        if (val === "next") return currentPos;

        // "+" で始まる場合: 現在のカーソルからの相対位置
        if (val.startsWith('+')) {
            const numPart = val.substring(1);
            const offset = numPart.startsWith('0x') ? parseInt(numPart, 16) : parseInt(numPart, 10);
            return currentPos + (isNaN(offset) ? 0 : offset);
        }

        // 通常の数値 (0x始まりは16進数として処理)
        return val.startsWith('0x') ? parseInt(val, 16) : parseInt(val, 10);
    }

    /**
     * 数値を指定した桁数の16進数文字列に変換する
     */
    toHex(num, digits) {
        // 負の数にならないよう丸め、16進数化して、指定桁数まで0で埋める
        const val = Math.max(0, Math.floor(num));
        return val.toString(16).toUpperCase().padStart(digits, '0');
    }

    /**
     * コンパイル実行
     * @param {string} mainText - main.s の内容
     * @param {object} tracksData - { "00": "code...", "01": "code..." }
     * @param {number} fps - フレームレート
     * @param {number} bpm - テンポ
     * @param {string} title - 曲のタイトル
     */
    compile(mainText, tracksData, fps, bpm, title) {
        const framesPerBeat = Math.round((60 / bpm) * fps);
        const framesPerBar = framesPerBeat * 4;

        let result = `# Mimi Music Format v2.0\n`;
        result += `# Title: ${title}\n`;
        result += `# Config: ${bpm}BPM, ${fps}FPS (1beat=${framesPerBeat}f)\n`;
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
                console.warn(`Warning: Track ${tId} not found at line ${index + 1}`);
                return;
            }

            const baseStart = this.parseVal(tStartStr, currentCursor);
            let maxTrackDuration = 0;

            // 各トラック内のノートを処理
            trackContent.split('\n').forEach(noteLine => {
                const nl = noteLine.split('#')[0].trim();
                if (!nl) return;

                // Track.s の書式: Type, Pitch, Length, Start, Vol, Pan
                const cols = nl.split(',').map(s => s.trim());
                if (cols.length < 4) return;

                // 各パラメータの計算と16進数化
                const type = this.toHex(this.parseVal(cols[0]), 2);
                
                // ピッチ（オフセット適用）
                const pitchVal = this.parseVal(cols[1]) + tPitchOff;
                const pitch = this.toHex(pitchVal, 2);
                
                // 長さと開始時間（開始時間は main.s の baseStart を加算）
                const lVal = this.parseVal(cols[2]);
                const sVal = this.parseVal(cols[3]);
                const len = this.toHex(lVal, 4);
                const start = this.toHex(sVal + baseStart, 8);
                
                // 音量（トラック全体の音量でスケーリング 0-255）
                const noteVol = this.parseVal(cols[4] || "255");
                const finalVol = Math.floor(noteVol * (tVolBase / 255));
                const vol = this.toHex(finalVol, 2);

                // パン（指定がなければトラックのデフォルトを使用）
                const panVal = cols[5] !== undefined ? this.parseVal(cols[5]) : tPanBase;
                const pan = this.toHex(panVal, 2);

                // .mimi 形式の1行を生成
                result += `${type}, ${pitch}, ${len}, ${start}, ${vol}, ${pan}\n`;

                // このトラックがいつ終わるかを記録
                maxTrackDuration = Math.max(maxTrackDuration, sVal + lVal);
            });

            // 次のトラックのためにカーソルを更新
            currentCursor = baseStart + maxTrackDuration;
        });

        return result;
    }
}