import { useEffect, useRef, useState, useCallback } from 'react'

let globalWs: WebSocket | null = null
let globalCallbacks: Set<(data: WSMessage) => void> = new Set()
let globalStatus: WSStatus = 'disconnected'
let statusListeners: Set<(status: WSStatus) => void> = new Set()

interface WSMessage {
  type: string
  event?: string
  path?: string
  rootPath?: string
}

type WSStatus = 'connecting' | 'connected' | 'disconnected'

function setStatus(status: WSStatus) {
  globalStatus = status
  statusListeners.forEach(cb => cb(status))
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
  }

  ws.onclose = () => {
    globalWs = null
    setStatus('disconnected')
    setTimeout(() => createGlobalWebSocket(), 3000)
  }

  ws.onerror = () => {
    ws.close()
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
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

export function useWebSocket(onMessage: (data: WSMessage) => void) {
  const [status, setStatusState] = useState<WSStatus>(globalStatus)

  useEffect(() => {
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
    if (globalWs) {
      globalWs.close()
      globalWs = null
    }
    createGlobalWebSocket()
  }, [])

  return { status, reconnect }
}