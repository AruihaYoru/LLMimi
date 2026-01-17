# Mimi Player

> A lightweight, dependency-free JavaScript library to play music from the `.mimi` text-based format.

Mimi Playerは、シンプルで人間が読み書きできる音楽フォーマット `.mimi` のための再生ライブラリです。Web Audio APIを使用して、テキストで書かれた楽譜をリアルタイムで音声に合成します。v1.0のシンプルさに加え、v2.0では表現力豊かなサウンドデザインが可能になりました。

**[Mimi Composer Demo](https://aruihayoru.github.io/mimi)**

## What is the `.mimi` format?

`.mimi` (Music instrument minimal interface) は、1行が1つの音符に対応する、非常にシンプルなテキストベースの音楽フォーマットです。バージョンによって利用できる機能が異なります。

- **ファイル拡張子**: `.mimi`
- **エンコーディング**: UTF-8推奨
- **構造**:
  - 各行はカンマ `,` で区切られたパラメータで1つの音符を定義します。
  - `#` で始まる行はコメントとして無視されます。
  - 空行は無視されます。

### Header (Recommended)
ファイル冒頭に、バージョンと曲の情報をコメントで記載することを強く推奨します。これにより、プレイヤーが適切なバージョンで解釈します。

```
# Mimi Music Format v2.0
# Title: My Awesome Song v2
# Tempo: 120
```

---

## Parameters (v2.0)

v2.0は、より詳細なサウンドコントロールを可能にする拡張フォーマットです。

| # | Parameter  | Format         | Description                                                                                               | Default |
|---|------------|----------------|-----------------------------------------------------------------------------------------------------------|---------|
| 1 | **Type**   | Hex `00-0F`    | 音の種類 (Waveform)。v1.0の波形に加え、多彩なシンセサウンドが利用可能です。詳細は後述。                   | -       |
| 2 | **Pitch**  | Float / MIDI   | 音の高さ。`69` (A4) のようなMIDIノート番号、または `440.0` のような周波数(Hz)で指定。                             | -       |
| 3 | **Length** | Float          | 音の長さ（秒単位）。アタックとリリースを除く、音の持続時間。                                                | -       |
| 4 | **Start**  | Float          | 開始地点（秒単位）。曲の先頭からの秒数。                                                                    | -       |
| 5 | **Volume** | Float `0.0-1.0`| 音量 (省略可)。                                                                                           | `0.5`   |
| 6 | **Pan**    | Float `-1.0-1.0`| パンニング (省略可)。`-1.0`: 左, `0.0`: 中央, `1.0`: 右。                                                    | `0.0`   |
| 7 | **Attack** | Float          | アタックタイム（秒単位、省略可）。音の立ち上がりに要する時間。                                              | `0.01`  |
| 8 | **Release**| Float          | リリースタイム（秒単位、省略可）。音が消えるまでの余韻の時間。                                              | `0.1`   |
| * | **Slide**  | Float (`;`の後)| ピッチスライド（秒単位、任意）。前の音からこの音のピッチに到達するまでの時間。`;`で区切って記述します。    | `0`     |

**v2.0 Example:**
```
# Type, Pitch, Len, Start, Vol, Pan, Atk, Rel ; Slide
# スーパーソウでC4のコードを0.1秒のアタックで鳴らす
0C, 60, 2.0, 0.0, 0.7, -0.5, 0.1, 0.5
0C, 64, 2.0, 0.0, 0.7,  0.5, 0.1, 0.5
0C, 67, 2.0, 0.0, 0.7,  0.0, 0.1, 0.5

# 2秒地点からPluck音源でベースライン。次の音に0.05秒でスライド
0E, 36, 0.4, 2.0
0E, 48, 0.4, 2.5 ;0.05
```

---

### Waveform Types (v2.0)
| Type | Name        | Description                       |
|------|-------------|-----------------------------------|
| `00` | Sine        | 正弦波 (柔らかい音)                 |
| `01` | Triangle    | 三角波 (笛のような音)               |
| `02` | Square      | 矩形波 (レトロゲーム風)             |
| `03` | Sawtooth    | 鋸歯状波 (鋭いシンセ音)             |
| `04` | White Noise | ホワイトノイズ (高域の強いノイズ)   |
| `05` | Pink Noise  | ピンクノイズ (自然なノイズ)         |
| `06` | Brown Noise | ブラウンノイズ (低音の強いノイズ)   |
| `07` | Pulse 6.25% | パルス波 (細い音)                   |
| `08` | Pulse 12.5% | パルス波                             |
| `09` | Pulse 25%   | パルス波                             |
| `0A` | FM Growl    | FMシンセ (唸るような金属音)         |
| `0B` | FM Metallic | FMシンセ (硬い金属音)             |
| `0C` | Super Saw   | スーパーソウ (厚みのあるシンセ音)   |
| `0D` | Short Noise | 短周期ノイズ (ピッチのあるノイズ)   |
| `0E` | Pluck       | 撥弦 (弦を弾いたような音)           |
| `0F` | **Mimi_hex**| 16進数データによる波形再生 (特殊用途) |

---

## Parameters (v1.0)
v1.0は、タイミングを**フレーム単位**、値を**16進数**で記述するシンプルなフォーマットです。

| # | Parameter | Format      | Description                                                 | Default |
|---|-----------|-------------|-------------------------------------------------------------|---------|
| 1 | **Type**  | Hex `00-04` | `00`:Sine, `01`:Triangle, `02`:Square, `03`:Sawtooth, `04`:Noise | -       |
| 2 | **Pitch** | Hex `00-7F` | MIDIノート番号。例: `3C` = C4                               | -       |
| 3 | **Length**| Hex `0000+` | 音の長さ (フレーム数)。`1フレーム = 1/24秒` (デフォルト)    | -       |
| 4 | **Start** | Hex `0000+` | 開始地点 (フレーム数)。                                     | -       |
| 5 | **Volume**| Hex `00-FF` | 音量 (省略可)。`00`:無音, `FF`:最大                         | `80`    |
| 6 | **Pan**   | Hex `00-FF` | パンニング (省略可)。`00`:左, `80`:中央, `FF`:右             | `80`    |

## Installation

### Use via CDN (Recommended)
`<script>`タグをHTMLに追加するだけで、Mimi Playerの全機能が利用可能になります。読み込み順序が重要です。
```html
<!-- Optional: For Type 0F (.mimi_hex) support -->
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.hex.min.js"></script>
<!-- For v2.0 support -->
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v2.min.js"></script>
<!-- For v1.0 support -->
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v1.min.js"></script>
<!-- Main Player Engine (Must be last) -->
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.min.js"></script>
```

## Usage (Quick Start)

1.  `MimiPlayer` のインスタンスを作成します。
2.  `.mimi` 形式のテキストデータを `player.load()` で読み込みます。（バージョンはヘッダーから自動判別されます）
3.  `player.play()` で再生します。

```html
<!DOCTYPE html>
<html>
<head>
    <title>Mimi Player v2.0 Demo</title>
</head>
<body>
    <textarea id="mimi-code" rows="10" cols="60">
# Mimi Music Format v2.0
# Type, Pitch, Len, Start, Vol, Pan, Atk, Rel
00, 60, 0.4, 0.0, 0.8, -1.0, 0.01, 0.1
01, 64, 0.4, 0.5, 0.8,  1.0, 0.01, 0.1
02, 67, 0.8, 1.0, 0.5,  0.0, 0.1,  0.2
    </textarea>
    <br>
    <button id="play-btn">Play</button>
    <button id="stop-btn">Stop</button>

    <!-- Load Mimi Player from CDN -->
    <script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.min.js"></script>
    
    <script>
        const player = new MimiPlayer();
        const mimiCodeEl = document.getElementById('mimi-code');
        const playBtn = document.getElementById('play-btn');

        playBtn.addEventListener('click', async () => {
            // AudioContext may require user interaction to start
            if (player.instance && player.instance.ctx.state === 'suspended') {
                await player.instance.ctx.resume();
            }
            await player.load(mimiCodeEl.value);
            player.play();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            player.stop();
        });
    </script>
</body>
</html>
```

## API Reference

### `new MimiPlayer(fps)`
MimiPlayerの新しいインスタンスを作成します。
- `fps` (Number, Optional, Default: `24`): v1.0のタイミング計算の基準となる1秒あたりのフレーム数。

### Methods
- `.load(text)`: `.mimi`形式の文字列をパースしてプレイヤーに読み込みます。ヘッダーからバージョンを自動判別し、適切なプレイヤーインスタンスを生成/切り替えします。 **非同期処理**のため、`await`するか`.then()`で繋げてください。
  - `text` (String): `.mimi`形式のデータ。
- `.play(startPoint)`: 読み込まれた音楽の再生を開始します。
  - `startPoint` (Number, Optional, Default: `0`): 再生を開始する位置。v1.0では**フレーム**、v2.0では**秒**を指定します。
- `.stop()`: 再生を即座に停止します。

### Properties
- `.instance`: 現在アクティブなプレイヤーインスタンス (`MimiPlayerV1` または `MimiPlayerV2`) への参照。
- `.version` (String): `load()`後に設定される、読み込まれた音楽のバージョン (`'1.0'` or `'2.0'`)。
- `.metadata` (Object): `load()`後に設定される、ヘッダーから読み取ったメタデータ (`{title, tempo, ...}`)。

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.