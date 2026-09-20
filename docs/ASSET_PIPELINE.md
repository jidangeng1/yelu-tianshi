# 夜师傅正式 2D 动画素材管线

## 目的与边界

本规范定义 M0 从 `m0-canvas-placeholder` 迁移到正式 2D 透明 PNG 素材时的交付格式。正式素材只替换渲染层；不得修改状态机、状态名称、时序、随机逻辑或输入锁。

素材目标为 390 × 844 竖屏场景中的水彩自然观察手帐：背景低对比、低饱和；夜师傅主体更清晰且有细描边。夜师傅必须保留红眼、深蓝灰/黑蓝头背、灰白身体、黄腿和细长白色头后饰羽等夜鹭辨识特征。不得做成 Q 版、儿童手游风，亦不得在正常状态让头顶或背部炸毛。

## 目录与帧序列

所有正式素材位于 `assets/official-v1/`：

```text
assets/official-v1/
├── README.md
├── heron/
│   ├── idle/
│   ├── eat/
│   └── poop/
├── fish/
└── environment/
```

- `heron/idle/`：缩脖待机、看向三个落点、恢复待机的小循环。
- `heron/eat/`：伸颈捕食、叼鱼、直接吞/鱼尾扑腾后吞、仰头吞咽与身体轻微变圆。左、正、右三个捕食方向分别提供可辨认的帧序列。
- `heron/poop/`：下蹲前摇、仅腹部和尾部蓬松、排泄、落水后轻微扑翅与恢复。头顶、颈部和背部在全程保持平整。
- `fish/`：抛出、入水、短距离游动和被叼住时所需的鱼帧。
- `environment/`：水彩池塘背景、枝叶、鱼篓、入水水花和涟漪；鱼篓固定于画面正下方，枝叶保持稀疏。

每个动画帧序列从 `000` 连续编号，不跳号。帧率和播放时长由现有状态机控制；导出方不在文件名中编码时长。

## PNG 透明与画布规范

- 交付 `PNG`，采用真彩色 RGBA（8 bit/通道）；禁止 JPG、色键透明、预乘黑边或把白/灰底烘进角色图。
- 每一帧使用同一逻辑画布尺寸和同一锚点。M0 基准画布为 390 × 844；高分辨率导出须保持整数倍率并记录倍率。
- 夜师傅帧以站脚/枝条接触点为锚点，避免动画切换时抖动；头、喙、尾部及白色饰羽不得被裁切。
- 角色、鱼、特效、鱼篓和背景分层导出。夜师傅、鱼、排泄白线、水花和涟漪必须保留透明背景。
- 禁止半透明画布底色、阴影烘底、边缘杂色和可见的透明棋盘格。白色排泄线应是单股细长连续线，不是 emoji、圆球或多股液滴。

## 命名规范

文件名全小写，使用 ASCII 连字符，格式为：

```text
<subject>-<action>-<variant>-<frame>.png
```

`variant` 为可选字段；`frame` 固定三位数，从 `000` 开始。例如：

```text
heron-idle-front-000.png
heron-track-left-004.png
heron-strike-right-006.png
heron-swallow-flutter-010.png
heron-poop-prep-003.png
fish-swim-left-002.png
environment-ripple-001.png
environment-basket-idle-000.png
```

同一序列内的 subject、action、variant、画布尺寸、锚点和层级必须一致。不可使用空格、中文文件名、版本号后缀、`final-final` 或省略补零的帧号。

## M0 动画状态对应关系

| M0 状态 | 正式素材动作 | 目录 |
| --- | --- | --- |
| `IDLE` | 缩脖待机；包含极轻微呼吸/观察循环 | `heron/idle/` |
| `THROW` | 鱼从鱼篓方向被抛出；鱼篓按下反馈 | `fish/`、`environment/` |
| `FISH_SWIM`、`TRACK` | 鱼入水短游；夜师傅向左/中/右锁定 | `fish/`、`heron/idle/` |
| `STRIKE` | 向三个落点的快速伸颈叼鱼 | `heron/eat/` |
| `PRE_SWALLOW` | 直接吞或鱼尾轻扑腾的叼鱼变体 | `heron/eat/`、`fish/` |
| `SWALLOW`、`ROUNDNESS` | 仰头、颈部拉长变粗、身体轻微变圆；不展示鱼在颈内 | `heron/eat/` |
| `POOP_PREP`、`POOP` | 原地下蹲；只腹尾蓬松；单股白线自尾部/泄殖腔落下 | `heron/poop/` |
| `RIPPLE` | 白线落水的克制水花与水彩涟漪 | `environment/` |
| `RECOVER` | 身体回升、腹尾恢复、双翅小幅扑动并回到缩脖待机 | `heron/poop/`、`heron/idle/` |

## 替换 placeholder 的接口要求

正式素材接入必须继续满足 `config.assets.interfaceVersion === 1`，并向 `SceneRenderer` 提供与现有占位包相同的五个渲染器：`background`、`basket`、`fish`、`effects` 和 `bird`。它们分别暴露以下方法：

```text
background.draw(ctx, model, config)
basket.draw(ctx, model, config)
fish.draw(ctx, model, beakTip, config)
effects.drawSplash(ctx, model, config)
effects.drawPoop(ctx, model, config)
effects.drawRipple(ctx, model, config)
bird.draw(ctx, model, config) -> { x, y } // 当前喙尖位置
```

素材加载器可在渲染层将上述 PNG 帧映射到 `model.state`、`model.progress`、`model.target` 和 `model.swallowVariant`，但不得向状态机添加素材专用状态。`bird.draw` 必须返回当前喙尖坐标，供 `fish.draw` 在 `PRE_SWALLOW` 中定位叼住的鱼。正式包上线后只切换 asset pack/config 层的选择；`SceneRenderer` 调用顺序、状态机和 M0 时长保持不变。
