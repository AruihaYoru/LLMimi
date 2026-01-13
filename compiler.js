class MimaCompiler {
    parseVal(val, currentPos = 0) {
        if (!val) return 0;
        val = val.trim().toLowerCase();
        
        if (val === "next") return currentPos;
        if (val.startsWith('+')) {
            const numPart = val.substring(1);
            const offset = numPart.startsWith('0x') ? parseInt(numPart, 16) : parseInt(numPart, 10);
            return currentPos + offset;
        }
        return val.startsWith('0x') ? parseInt(val, 16) : parseInt(val, 10);
    }

    toHex(num, digits) {
        return Math.max(0, Math.floor(num)).toString(16).toUpperCase().padStart(digits, '0');
    }


    compile(mainText, tracksData, fps, bpm, title) {
        const framesPerBeat = Math.round((60 / bpm) * fps);
        const framesPerBar = framesPerBeat * 4;

        let result = `# Mimi Music Format v1.0\n`;
        result += `# Title: ${title}\n`;
        result += `# Tempo: ${bpm}BPM (1beat = ${framesPerBeat}frames / 1bar = ${framesPerBar}frames)\n`;
        result += `# Type, Pitch, Length, Start, Volume, Pan\n\n`;

        const lines = mainText.split('\n');
        let currentCursor = 0;

        lines.forEach(line => {
            const l = line.split('#')[0].trim();
            if (!l) return;

            const [tId, tStart, tPitchOff, tVol, tPan] = l.split(',').map(s => s.trim());
            const trackContent = tracksData[tId];
            if (!trackContent) return;

            const baseStart = this.parseVal(tStart, currentCursor);
            const basePitch = this.parseVal(tPitchOff || "0");
            const baseVol = tVol !== undefined ? this.parseVal(tVol) : 255;
            const basePan = tPan !== undefined ? this.parseVal(tPan) : 128;

            let maxTrackDuration = 0;

            trackContent.split('\n').forEach(noteLine => {
                const nl = noteLine.split('#')[0].trim();
                if (!nl) return;

                const cols = nl.split(',').map(s => s.trim());
                if (cols.length < 4) return;

                const type = this.toHex(this.parseVal(cols[0]), 2);
                const pitch = this.toHex(this.parseVal(cols[1]) + basePitch, 2);
                const lVal = this.parseVal(cols[2]);
                const len = this.toHex(lVal, 4);
                const sVal = this.parseVal(cols[3]);
                const start = this.toHex(sVal + baseStart, 8);
                
                const vol = this.toHex((this.parseVal(cols[4] || "255") * (baseVol / 255)), 2);
                const pan = this.toHex(cols[5] !== undefined ? this.parseVal(cols[5]) : basePan, 2);

                result += `${type}, ${pitch}, ${len}, ${start}, ${vol}, ${pan}\n`;
                maxTrackDuration = Math.max(maxTrackDuration, sVal + lVal);
            });

            currentCursor = baseStart + maxTrackDuration;
        });

        return result;
    }
}