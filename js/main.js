/**
 * LLMimi Studio - Main Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // インスタンス生成
    const player = new MimiPlayer();
    const compiler = new MimaCompiler();

    // DOM要素の取得
    const mainSeq = document.getElementById('mainSeq');
    const tracksContainer = document.getElementById('tracksContainer');
    const noteMonitor = document.getElementById('noteMonitor');
    const outputMimi = document.getElementById('outputMimi');
    const titleInput = document.getElementById('titleInput');
    const fpsInput = document.getElementById('fpsInput');
    const bpmInput = document.getElementById('bpmInput');
    const fileInput = document.getElementById('fileInput');

    // 再生中のデータを保持する変数
    let activeNotesData = []; 

    /**
     * トラックコンテナを追加する
     * @param {string|null} id - トラックID (00, 01...)
     * @param {string} content - 初期コード
     */
    function addTrack(id = null, content = "") {
        const existingTracks = document.querySelectorAll('.track-data');
        const trackId = id !== null ? id : existingTracks.length.toString().padStart(2, '0');
        
        const container = document.createElement('div');
        container.className = 'track-container';
        container.innerHTML = `
            <div class="track-header">
                <div class="track-title-group">
                    <img src="./assets/icon_track.png" alt="" class="icon-s">
                    <strong>Track ${trackId}.s</strong>
                </div>
                <div class="track-header-btns">
                    <button class="play-track-btn" data-id="${trackId}" title="Solo Play">
                        <img src="./assets/icon_solo.png" alt="" class="btn-icon-s"> Solo
                    </button>
                    <button class="remove-btn" title="Remove Track">
                        <img src="./assets/icon_delete.png" alt="" class="btn-icon-s">
                    </button>
                </div>
            </div>
            <textarea class="track-data" data-id="${trackId}" rows="8" spellcheck="false" 
                placeholder="Type, Pitch, Length, Start, Volume, Pan">${content}</textarea>
        `;

        // 削除ボタンのイベント
        container.querySelector('.remove-btn').onclick = () => {
            if (confirm(`Remove Track ${trackId}.s?`)) {
                container.remove();
            }
        };

        // ソロ再生ボタンのイベント
        container.querySelector('.play-track-btn').onclick = () => {
            playSolo(trackId);
        };

        tracksContainer.appendChild(container);
    }

    /**
     * 特定のトラックだけを再生する
     */
    function playSolo(trackId) {
        // メインシーケンスを一時的に「そのトラックだけを即座に鳴らす」ものに置き換えてコンパイル
        const soloMain = `${trackId}, 0, 0, 255, 128`;
        runCompile(soloMain);
    }

    /**
     * コンパイルして再生を実行
     * @param {string|null} customMain - 指定があればそのコードをメインとして使う（ソロ用）
     */
    function runCompile(customMain = null) {
        const fps = parseInt(fpsInput.value) || 24;
        const bpm = parseInt(bpmInput.value) || 120;
        const title = titleInput.value || "Untitled";
        const mainText = customMain || mainSeq.value;

        // すべてのトラックからデータを収集
        const tracksData = {};
        document.querySelectorAll('.track-data').forEach(ta => {
            tracksData[ta.dataset.id] = ta.value;
        });

        try {
            // コンパイル実行
            const compiledMimi = compiler.compile(mainText, tracksData, fps, bpm, title);
            outputMimi.value = compiledMimi;

            // プレイヤーの設定と再生
            player.fps = fps;
            player.load(compiledMimi);
            player.play();
            
            // モニター表示用にコンパイル結果をパースしておく
            prepareMonitorData(compiledMimi);
        } catch (error) {
            console.error(error);
            alert("Compile Error: " + error.message);
        }
    }

    /**
     * コンパイル後のテキストからモニター用のノートリストを作成
     */
    function prepareMonitorData(mimiText) {
        activeNotesData = mimiText.split('\n')
            .filter(line => {
                const l = line.trim();
                return l && !l.startsWith('#') && l.includes(',');
            })
            .map(line => {
                const parts = line.split(',').map(s => s.trim());
                return {
                    type:  parseInt(parts[0], 16),
                    pitch: parseInt(parts[1], 16),
                    len:   parseInt(parts[2], 16),
                    start: parseInt(parts[3], 16),
                    vol:   parseInt(parts[4], 16)
                };
            });
        console.log("Monitor data prepared:", activeNotesData.length, "notes");
    }

    /**
     * モニターの更新ループ
     */
    setInterval(() => {
        const isPlaying = player.playing || player.isPlaying || (player.status === 'playing');
        const currentFrame = (player.currentFrame !== undefined) ? player.currentFrame : player.frame;

        if (!isPlaying) {
            noteMonitor.innerHTML = `<span style="color:#666">IDLE</span>`;
            return;
        }

        const currentPlaying = activeNotesData.filter(n => 
            currentFrame >= n.start && currentFrame < (n.start + n.len)
        );
        
        let html = `<div style="margin-bottom:5px; border-bottom:1px solid #444; padding-bottom:3px;">
                        <strong style="color:#fff">FRAME: ${currentFrame}</strong>
                    </div>`;

        if (currentPlaying.length === 0) {
            html += `<span style="color:#444">SILENCE</span>`;
        } else {
            currentPlaying.forEach(n => {
                const volStr = "■".repeat(Math.ceil(n.vol / 32)).padEnd(8, '░');
                html += `<div class="monitor-item">
                    <span style="color:var(--accent-color)">HEX:${n.pitch.toString(16).toUpperCase().padStart(2,'0')}</span>
                    <span style="font-size:9px; color:#aaa; margin-left:10px;">${volStr}</span>
                </div>`;
            });
        }
        noteMonitor.innerHTML = html;
    }, 50);

    /**
     * .mina ファイル (ZIP) として保存
     */
    async function saveMina() {
        const zip = new JSZip();
        
        // プロジェクト設定
        const projectData = {
            title: titleInput.value,
            fps: fpsInput.value,
            bpm: bpmInput.value,
            main: mainSeq.value,
            version: "2.0"
        };
        zip.file("project.json", JSON.stringify(projectData, null, 2));
        
        // 個別トラックの保存
        const tracksFolder = zip.folder("tracks");
        document.querySelectorAll('.track-data').forEach(ta => {
            tracksFolder.file(`${ta.dataset.id}.s`, ta.value);
        });

        // ZIP生成とダウンロード
        const content = await zip.generateAsync({type: "blob"});
        const fileName = (titleInput.value || "mySong") + ".mina";
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * .mina ファイルを読み込む
     */
    async function loadMina(file) {
        try {
            const zip = await JSZip.loadAsync(file);
            
            // project.json の読み込み
            const projectJson = await zip.file("project.json").async("string");
            const project = JSON.parse(projectJson);

            // 基本情報の復元
            titleInput.value = project.title || "Untitled";
            fpsInput.value = project.fps || 24;
            bpmInput.value = project.bpm || 120;
            mainSeq.value = project.main || "";

            // トラックの復元
            tracksContainer.innerHTML = ""; // 既存をクリア
            const trackFiles = zip.folder("tracks").file(/\.s$/);
            
            // ファイル名順にソートして追加
            trackFiles.sort((a, b) => a.name.localeCompare(b.name));

            for (let f of trackFiles) {
                const id = f.name.replace("tracks/", "").replace(".s", "");
                const content = await f.async("string");
                addTrack(id, content);
            }

            console.log("Project loaded successfully.");
        } catch (err) {
            alert("Failed to load .mina file: " + err.message);
        }
    }

    // --- ボタンイベント登録 ---

    document.getElementById('playBtn').onclick = () => runCompile();
    document.getElementById('stopBtn').onclick = () => player.stop();
    document.getElementById('addTrackBtn').onclick = () => addTrack();
    document.getElementById('saveBtn').onclick = saveMina;
    
    document.getElementById('loadBtn').onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            loadMina(e.target.files[0]);
        }
    };

    // --- 初期サンプルの配置 ---
    const initMain = `# Main Loop
# TrackID, Start, PitchOff, Vol, Pan
00, 0, 0, 255, 128
00, 48, 4, 255, 128
01, 0, 0, 180, 80`;

    const initTrack00 = `# Drum Pattern
04, 0x24, 2, 0, 255, 128
04, 0x24, 2, 12, 180, 128
04, 0x24, 2, 24, 255, 128
04, 0x24, 2, 36, 180, 128`;

    const initTrack01 = `# Bass Line
02, 0x18, 12, 0, 200, 128
02, 0x1B, 12, 24, 200, 128`;

    mainSeq.value = initMain;
    addTrack('00', initTrack00);
    addTrack('01', initTrack01);

});