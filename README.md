# Sonic Walk — 音の散歩
**An Interactive Sound Journey** · interactive media sound design project

一个网页里的交互声音作品：玩家在一条日系黄昏街道上行走，从「城市噪音」走向「自然与神社」，
行走位置、鼠标、麦克风、键盘实时改变声音（音频层接入中，见 Roadmap）。

**🎧 在线演示：** <https://wangzetian-iverson.github.io/sonic-walk/> ·（建议戴耳机，允许麦克风可选）
<img width="1219" height="640" alt="image" src="https://github.com/user-attachments/assets/2383da48-81df-44e0-bcac-4e5fd53a5626" />
<img width="1253" height="672" alt="image" src="https://github.com/user-attachments/assets/14b3a5e1-9073-4349-ad3f-63bedb11a592" />
<img width="1269" height="661" alt="image" src="https://github.com/user-attachments/assets/388c5430-937d-4336-a9c0-df8084950977" />
<img width="1270" height="651" alt="image" src="https://github.com/user-attachments/assets/fd2ddb5e-29e8-4ea2-aad9-4bb8a06f231f" />




## 运行

```bash
npx http-server -p 5341 -c-1
# 打开 http://localhost:5341
```

所有依赖（three.js / p5.js / p5.sound）都在 `lib/` 本地，**无需联网**，现场演示安全。

## 操作

| 输入 | 作用 |
| --- | --- |
| `W / ↑` | 向前走（`S / ↓` 后退）— 脚步声随地面材质切换 |
| 鼠标 Y | LowPass 滤波亮度（越高越亮）；鼠标 X = 视角 + 声像 |
| 鼠标快速甩动 | 数字 glitch 三连音 |
| `P` | 自动行走（presentation 模式，约 75–90 秒走完） |
| `1–5` | 声音层开关：城市 / 身体心跳 / 风 / 鸟 / 溪水 |
| `6 / 7 / 8` | 一次性音效：拉链 / 钥匙 / 提示音 |
| `Space` | 神社前触发 final bloom（风铃琶音 + 花瓣爆发 + "Have you walked today?"） |
| 麦克风 | 音量驱动心跳 BPM/强度 + 呼吸层（可选，拒绝授权也能运行） |
| SOUND SOURCES 面板 | 起始页按钮：开始前上传自己的录音替换任意采样槽，行走开始时即生效 |

## 旅程结构（= 声音结构）

| 进度 | 区域 | 场景 | 声音（规划） |
| --- | --- | --- | --- |
| 0.0–0.3 | URBAN ROUTINE | 居酒屋招牌、电线、贩卖机、路灯 | 城市底噪、低通滤波压抑感 |
| 0.3–0.55 | BODY AWAKENING | 街道尽头、石墙、树篱 | 脚步、呼吸、合成心跳 |
| 0.55–0.9 | INTO THE FOREST | 鸟居隧道、樱花、松树、小溪、太鼓桥 | 风、鸟、水，城市声被滤掉 |
| 0.9–1.0 | THE SHRINE | 神社、石灯笼、萤火虫、落樱 | 融合 pad + “Have you walked?” |

行走进度 `progress (0→1)` 是整个作品的主参数：天空/雾/光照颜色、花瓣萤火虫密度，
以及（下一步）city↔nature 声音 crossfade 都由它驱动。

## 代码结构

```
index.html          页面 + start overlay + HUD
css/style.css       UI 样式
js/main.js          渲染器、灯光、bloom 后处理、主循环、climax
js/palette.js       全局配色 + toon/glow 材质工具
js/sky.js           渐变天穹、夕阳、云、远山剪影
js/city.js          建筑(程序化立面贴图)、店面、竖排汉字招牌、电线杆、贩卖机
js/nature.js        鸟居、石灯笼、太鼓桥、动画水面、神社、instanced 森林/花草
js/ground.js        柏油→草地渐变地面 shader、步道
js/particles.js     落樱(instanced) + 萤火虫(points) + climax burst
js/player.js        第一人称行走、head bob、脚步事件、自动行走
js/ui.js            进度条、区域 toast、麦克风电平表、SOUNDS 上传面板
js/audio.js         ★ p5.sound 音频引擎：采样层 + 合成层 + 处理链 + 上传槽位
tools/generate_samples.js  离线 DSP：程序化合成全部默认采样（node 运行）
Documentation/      presentation_notes.md（演讲重点：recording/synthesis/processing/expression）
lib/                three.js + p5.js + p5.sound（本地化，离线可运行）
assets/sounds/      16 个默认采样（城市/风/鸟/水/呼吸/脚步×8/拉链/钥匙/提示音）
```
<img width="1086" height="1448" alt="image" src="https://github.com/user-attachments/assets/31f27c22-bccb-4815-aa59-cb8e5cf3a3ec" />

## 音频架构

- **采样层**（Recording）：16 个 WAV 由 `tools/generate_samples.js` 程序化合成，
  演出前可在 SOUNDS 面板上传真实录音热替换（`node tools/generate_samples.js` 可重新生成）
- **合成层**（Synthesis）：心跳 lub-dub（54Hz 正弦+双包络，BPM 由麦克风/走路驱动）、
  失谐三角波 drone、五声音阶风铃 bank、glitch 变速三连音
- **处理链**（Processing）：城市层→LowPass（鼠标 Y 自动化）；自然层→Reverb（dry/wet 随进度 0.15→0.7）；
  脚步→随机 pingPong Delay + 变速 + 左右交替声像
- **主参数**：行走进度 p 同时驱动视觉（天空/雾/光）和听觉（crossfade/混响/合成器音量）


