import { WebSocket } from 'ws'

const HEARTBEAT_INTERVAL_MS = 30000

interface AliveWebSocket extends WebSocket {
  isAlive?: boolean
}

/**
 * 为新连接附加心跳:
 * - 处理应用层 {type: 'ping'} 消息并回复 {type: 'pong'}
 * - 监听协议层 pong 事件,维护 isAlive 标记
 *
 * 在 wss.on('connection', (ws) => ...) 内对每个 ws 调用一次。
 */
export function attachHeartbeat(ws: WebSocket) {
  const aws = ws as AliveWebSocket
  aws.isAlive = true
  aws.on('pong', () => {
    aws.isAlive = true
  })
  aws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString())
      if (data?.type === 'ping') {
        aws.isAlive = true
        if (aws.readyState === WebSocket.OPEN) {
          try {
            aws.send(JSON.stringify({ type: 'pong' }))
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // 非 JSON 消息忽略
    }
  })
}

/**
 * 启动全局心跳定时器:每 30s 巡检一次,清理半开连接,并对存活连接发送协议层 ping。
 * 返回 interval handle 以便外部 clear。
 */
export function startHeartbeatTimer(clients: Set<WebSocket>) {
  return setInterval(() => {
    clients.forEach((ws) => {
      const aws = ws as AliveWebSocket
      if (aws.isAlive === false) {
        try {
          aws.terminate()
        } catch {
          // ignore
        }
        clients.delete(ws)
        return
      }
      aws.isAlive = false
      try {
        aws.ping()
      } catch {
        // ignore
      }
    })
  }, HEARTBEAT_INTERVAL_MS)
}
