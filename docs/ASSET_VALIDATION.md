# official-v1 PNG 验收

正式美术交付到 `assets/official-v1/` 后，运行：

```bash
npm run validate-assets
```

该命令递归检查该目录下的每一个 `.png` 文件，并逐文件输出：

```text
asset:
heron/poop/heron-poop-000.png

format:
RGBA

alpha:
PASS

transparent_pixels:
381244 (36.36%)

opaque_only:
false

checkerboard:
PASS

size:
1024x1024

result:
PASS
```

`transparent_pixels` 统计 Alpha 小于 255 的像素，并同时给出占整张图的比例。`opaque_only: true` 表示所有像素的 Alpha 均为 255；这不符合透明角色、鱼或特效素材的交付要求。

## 失败条件

验收脚本会以非零状态退出，并把单个素材标记为 `FAIL`，如果出现以下任一情况：

- 文件扩展名为 PNG 但内容不是有效 PNG。
- 图片不是非交错、8 bit 的 `RGBA` PNG，例如 RGB PNG 或没有 Alpha 通道的 PNG。
- 全部像素的 Alpha 都是 255。
- 图片呈现常见的全不透明灰色交替棋盘格，说明透明背景被烘进了像素。

透明 PNG 应保留真实 Alpha，不要以白底、灰底或棋盘格代替透明区域。该工具只做资源质量验收，不加载图片、不改动 Canvas 渲染，也不改动游戏状态机。

如需在临时目录验收外部交付，可直接传入目录：

```bash
node scripts/validate-assets.js path/to/asset-delivery
```
