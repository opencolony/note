export interface PlaygroundVariant {
  name: string
  description?: string
  component: React.ReactNode
}

export interface PlaygroundCase {
  id: string
  name: string
  description?: string
  variants: PlaygroundVariant[]
}
