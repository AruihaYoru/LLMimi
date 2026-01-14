document.addEventListener('DOMContentLoaded', () => {
    const player = new MimiPlayer();
    const compiler = new MimaCompiler();

    const mainSeq = document.getElementById('mainSeq');
    const tracksContainer = document.getElementById('tracksContainer');
    const outputMimi = document.getElementById('outputMimi');
    const fpsInput = document.getElementById('fpsInput');
    
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const addTrackBtn = document.getElementById('addTrackBtn');

    let trackCount = 0;

    function addTrack(id = null, content = "") {
        const trackId = id !== null ? id : trackCount.toString().padStart(2, '0');
        
        const container = document.createElement('div');
        container.className = 'track-container';
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>Track ${trackId}.s</strong>
                <button class="remove-btn" title="Remove Track">×</button>
            </div>
            <textarea class="track-data" data-id="${trackId}" rows="8" 
                placeholder="Type, Pitch, Length, Start, Volume, Pan">${content}</textarea>
        `;

        container.querySelector('.remove-btn').onclick = () => {
            if (confirm(`Remove Track ${trackId}.s?`)) {
                container.remove();
            }
        };

        tracksContainer.appendChild(container);
        if (id === null) trackCount++;
    }

	function compileAndPlay() {
		const fps = parseInt(document.getElementById('fpsInput').value) || 24;
		const bpm = parseInt(document.getElementById('bpmInput').value) || 120;
		const title = document.getElementById('titleInput').value || "Untitled";
		const mainText = document.getElementById('mainSeq').value;

		const tracksData = {};
		document.querySelectorAll('.track-data').forEach(ta => {
			tracksData[ta.dataset.id] = ta.value;
		});

		try {
			const compiledMimi = compiler.compile(mainText, tracksData, fps, bpm, title);
			document.getElementById('outputMimi').value = compiledMimi;

			player.fps = fps;
			player.load(compiledMimi);
			player.play();
		} catch (error) {
			alert("Compile Error: " + error.message);
		}
	}

    playBtn.onclick = compileAndPlay;

    stopBtn.onclick = () => {
        player.stop();
    };

    addTrackBtn.onclick = () => addTrack();

    const sampleMain = `# Main Loop
# Track, Start, PitchOffset, Vol, Pan
00, 0, 0, 255, 128
00, 48, 0, 255, 128
01, 0, 0, 200, 80`;

    const sampleTrack00 = `# Drum Pattern
04, 0, 2, 0, 255, 128
04, 0, 4, 12, 180, 128
04, 0, 2, 24, 255, 128
04, 0, 4, 36, 180, 128`;

    const sampleTrack01 = `# Bass Line
02, 36, 12, 0, 200, 128
02, 39, 12, 24, 200, 128`;

    mainSeq.value = sampleMain;
    addTrack('00', sampleTrack00);
    addTrack('01', sampleTrack01);
    trackCount = 2;
});