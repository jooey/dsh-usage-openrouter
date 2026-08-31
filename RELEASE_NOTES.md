# Release Notes

## v1.0.2

**兼容 dsh 0.1.2-alpha.2**

- 客户端 `inject` 显式声明 `remote.session`：新版 Cordis 守卫会把 `directoryFor()` 内部的 session 远端访问归属到插件，不声明则在服务重启后首次创建会话目录时被拒，用量读条全部消失
- 读条宽度计算加 14px 安全边距：新版输入框工具行把 slot 容器改为 `display: contents`，旧的剩余空间算法差几个像素会把整行挤成两行
- `peerDependencies` 的 dsh-* 范围放宽为 `>=`，与实际兼容的 dsh 版本一致

**English**: declare `remote.session` in the client inject (dsh 0.1.2 guard rejects transitive session-remote access, killing all readouts after a restart); add a 14px safety margin to the chip width fit (the new display:contents composer row wrapped to two lines); relax stale peer ranges.
