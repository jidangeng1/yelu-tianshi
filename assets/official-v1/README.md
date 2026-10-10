# official-v1 正式美术素材

此目录只存放夜师傅 M0 正式 2D 动画素材的接收位置和接入说明。

正式美术素材由外部生成工具提供；Codex 只负责按 `docs/ASSET_PIPELINE.md` 校验并接入素材，不生成任何图片。

提交素材前，请确认 PNG 透明、目录、帧号、锚点和状态映射均符合该规范。

当前已接入 `heron/eat/heron-eat-000.png` 至 `heron-eat-005.png` 六帧吃鱼序列。渲染层以 8 FPS 单次播放，并以源图统一的 `y=480` 脚部基线定位；素材尚未全部加载或任一帧加载失败时，自动退回 `m0-canvas-placeholder` Canvas 夜师傅，不中断游戏状态机。
