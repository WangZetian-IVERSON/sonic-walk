# Sonic Walk — Presentation Notes
音の散歩 · An Interactive Sound Journey

> 90 秒的第一人称声音步行：从压抑的城市走过鸟居，进入森林，抵达神社。
> 不是给画面配音，而是**用交互把"步行的心理变化"做成可以听的过程**：
> routine → rhythm → exploration → wellbeing。

---

## 1. Recording（声音采集 / 采样层）

作品的采样层是一个**可替换的录音槽位系统**（右上角 SOUNDS 面板）：

| 槽位 | 声音 | 在作品中的角色 |
| --- | --- | --- |
| City ambience | 街道环境 | routine：低沉、被 low-pass 压住的城市底噪 |
| Footsteps ×8 | 街道脚步 / 林间脚步 | rhythm：身体的节奏，随地面材质切换 |
| Breathing | 呼吸 | 身体存在感，由麦克风音量放大 |
| Zipper / Keys | 拉链、钥匙 | 出门的仪式感（按键 6 / 7 触发） |
| Wind & leaves / Birds / Stream | 自然层 | exploration：随步行逐渐打开 |
| Notification | 健康 App 提示音 | 数字身体数据的符号 |

**Presentation 讲法**：默认采样由离线 DSP 脚本程序化合成（`tools/generate_samples.js`，
纯 Node 手写波形：噪声整形、共振滤波、包络、颗粒堆叠），作为占位 sample；
演出版本换成手机实录的真实声音——面板里 UPLOAD 一键热替换，引擎路由不变。
这本身就是一个观点：**声音的"真实感"是设计出来的，录音和合成在同一个系统里平等**。

## 2. Synthesis（实时合成，p5.sound）

全部在浏览器里实时发声，不是预渲染：

- **心跳**：54 Hz 正弦 + 两个 ADSR 包络做 lub-dub 双击；BPM 由
  `走路状态 + 麦克风音量 + 旅程位置` 实时计算（52–90+ BPM）
- **探索 drone**：两个失谐三角波（110 / 110.65 Hz，左右分声道）+ 55 Hz sub，
  在森林段淡入；神社段加入五度音（164.8 Hz）
- **风铃（furin）**：4 振荡器 bell bank，A 五声音阶（1760–2960 Hz），
  指数衰减包络，在 progress > 0.55 后随机稀疏触发
- **数字 glitch**：提示音采样以随机 0.4×–1.2× 变速三连发，由鼠标快速移动触发

## 3. Sound Processing（声音处理）

| 处理 | 实现 | 自动化来源 |
| --- | --- | --- |
| Filter automation | p5.LowPass 挂在城市层 | **鼠标高度** = 亮度（300 Hz–6.7 kHz），走得越远滤波越开 |
| Reverb | p5.Reverb (4s / decay 2.2) 挂自然层 | dry/wet 0.15 → 0.7 随**步行进度**变大——空间随旅程打开 |
| Delay | p5.Delay pingPong 处理脚步 | 只在森林里随机出现——脚步开始"有回声" |
| Pitch / rate | 每一步 0.92–1.08× 随机变速；glitch 大幅变速 | 破坏采样的机械感 |
| Panning | 脚步左右交替 ±0.22；城市/自然底噪随视线反向偏移 | **鼠标 X** |
| Crossfade | 城市 ↔ 风/鸟/水 的连续混合 | **步行位置**（作品的主参数） |

## 4. Artistic Expression（艺术表达）

> 主张：日常步行不是机械位移，而是身体、环境和数字系统共同参与的感知过程。

四段心理弧线（区域进入时有字幕提示）：

1. **URBAN ROUTINE 都会の雑踏** — 城市噪音被 low-pass 压得很闷（心理上的"关闭"），
   健康 App 提示音每隔几秒响起：数据在催促身体。
2. **BODY AWAKENING 身体の目覚め** — 脚步建立节奏，心跳出现；
   **对着麦克风呼吸，心跳会加速变强**——作品在"听"观众的身体。
3. **INTO THE FOREST 森の中へ** — 穿过鸟居，城市声被滤掉，
   风、鸟、水按空间位置淡入（溪水真的在桥的位置最响），混响把空间撑开。
4. **THE SHRINE 静けさの社** — 按 Space：五声音阶风铃上行、全部声层融合、
   花瓣爆发，最后一句合成语音轻声问 *"Have you walked today?"*
   ——健康不是数据，是身体和环境重新连接的瞬间。

## 5. 现场演示流程（建议）

1. 开场停在城市段，鼠标上下拉几次 → 让观众听到 filter automation
2. 按 `1` 关/开城市层 → 展示分层
3. 对麦克风呼吸/拍手 → 心跳变化（右上角有电平表）
4. 按 `P` 自动行走，走到桥上 → 溪水在空间中出现
5. 神社前按 `Space` → final bloom
6. 保底：全程录屏 demo video（浏览器权限/声卡出问题时播放）

按键速查：`W/↑` 走 · `P` 自动 · `1–5` 层开关（城市/身体/风/鸟/水）· `6/7/8` 拉链/钥匙/提示音 · `Space` 终章

## 6. 课程要求对照

| 要求 | 对应 |
| --- | --- |
| Sound recording | 可替换采样槽 ×10（默认程序化合成，演出版换实录） |
| Sound synthesis | 心跳/drone/风铃/glitch 全部 p5.Oscillator + Envelope 实时合成 |
| Sound processing | LowPass / Reverb / Delay / rate / pan / crossfade 全部参数自动化 |
| Interaction | 步行位置 + 鼠标 XY + 鼠标速度 + 麦克风 + 键盘 |
| 1–2 min | 自动行走 ~75–90 秒 |
| Artistic expression | routine → rhythm → exploration → wellbeing 的听觉叙事 |
| Technical execution | Three.js 3D 场景 + p5.sound 实时引擎，全离线运行 |
