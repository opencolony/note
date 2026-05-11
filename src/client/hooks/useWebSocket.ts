import { useEffect, useState, useCallback } from 'react'

let globalWs: WebSocket | null = null
let globalCallbacks: Set<(data: WSMessage) => void> = new Set()
let globalStatus: WSStatus = 'disconnected'
let statusListeners: Set<(status: WSStatus) => void> = new Set()
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let visibilityBound = false

const HEARTBEAT_INTERVAL = 25000
const PONG_TIMEOUT = 10000
const RECONNECT_DELAY = 3000

interface WSMessage {
  type: string
  event?: string
  path?: string
  rootPath?: string
}

type WSStatus = 'connecting' | 'connected' | 'disconnected'

function setStatus(status: WSStatus) {
  globalStatus = status
  statusListeners.forEach((cb) => cb(status))
}

function clearHeartbeatTimers() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (pongTimeoutTimer) {
    clearTimeout(pongTimeoutTimer)
    pongTimeoutTimer = null
  }
}

function sendPing() {
  if (globalWs?.readyState !== WebSocket.OPEN) return
  try {
    globalWs.send(JSON.stringify({ type: 'ping' }))
  } catch {
    return
  }
  if (pongTimeoutTimer) clearTimeout(pongTimeoutTimer)
  pongTimeoutTimer = setTimeout(() => {
    // 未在 PONG_TIMEOUT 内收到 pong,视为半开连接,强制关闭触发重连
    pongTimeoutTimer = null
    if (globalWs) {
      try {
        globalWs.close()
      } catch {
        // ignore
      }
    }
  }, PONG_TIMEOUT)
}

function startHeartbeat() {
  clearHeartbeatTimers()
  heartbeatTimer = setInterval(sendPing, HEARTBEAT_INTERVAL)
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    createGlobalWebSocket()
  }, RECONNECT_DELAY)
}

function createGlobalWebSocket() {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws`

  setStatus('connecting')
  const ws = new WebSocket(wsUrl)
  globalWs = ws

  ws.onopen = () => {
    setStatus('connected')
    startHeartbeat()
  }

  ws.onclose = () => {
    globalWs = null
    clearHeartbeatTimers()
    setStatus('disconnected')
    scheduleReconnect()
  }

  ws.onerror = () => {
    try {
      ws.close()
    } catch {
      // ignore
    }
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'pong') {
        if (pongTimeoutTimer) {
          clearTimeout(pongTimeoutTimer)
          pongTimeoutTimer = null
        }
        return
      }
      if (data.type === 'config:reload') {
        window.dispatchEvent(new CustomEvent('config-changed'))
        return
      }
      globalCallbacks.forEach((cb) => cb(data))
    } catch {
      // ignore
    }
  }
}

function ensureConnection() {
  if (!globalWs) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    createGlobalWebSocket()
    return
  }
  const state = globalWs.readyState
  if (state === WebSocket.CLOSING || state === WebSocket.CLOSED) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    createGlobalWebSocket()
    return
  }
  if (state === WebSocket.OPEN) {
    // 立即发一次 ping 探测是否为半开连接,未响应会自动触发重连
    sendPing()
  }
}

function bindVisibilityListeners() {
  if (visibilityBound || typeof window === 'undefined') return
  visibilityBound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ensureConnection()
    }
  })
  window.addEventListener('online', () => {
    ensureConnection()
  })
}

export function useWebSocket(onMessage: (data: WSMessage) => void) {
  const [status, setStatusState] = useState<WSStatus>(globalStatus)

  useEffect(() => {
    bindVisibilityListeners()
    globalCallbacks.add(onMessage)
    statusListeners.add(setStatusState)

    setStatusState(globalStatus)

    if (!globalWs || (globalWs.readyState !== WebSocket.OPEN && globalWs.readyState !== WebSocket.CONNECTING)) {
      createGlobalWebSocket()
    }

    return () => {
      globalCallbacks.delete(onMessage)
      statusListeners.delete(setStatusState)
    }
  }, [onMessage])

  const reconnect = useCallback(() => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (globalWs) {
      try {
        globalWs.close()
      } catch {
        // ignore
      }
      globalWs = null
    }
    clearHeartbeatTimers()
    createGlobalWebSocket()
  }, [])

  return { status, reconnect }
}
