# Tmux 开发会话

**所有开发服务的启动、停止必须在名为 `note` 的 Tmux 会话中进行。**

- 启动服务前先检查 `tmux ls` 是否存在 `note` 会话，不存在则 `tmux new-session -d -s note`
- 在 `note` 会话中启动 `pnpm dev` / `pnpm dev:frontend` / `pnpm start` 等服务
- 停止服务时通过 `tmux send-keys -t note C-c` 发送中断信号，或通过 `tmux kill-session -t note` 关闭整个会话
- 查看服务日志使用 `tmux capture-pane -t note -p` 或直接 attach `tmux attach -t note`
- **禁止**在当前 Shell 直接运行开发服务命令，必须通过 Tmux 会话管理
