import React from 'react'
import { FolderOpenFilled, FolderFilled, FileFilled, DeleteOutlined } from '@ant-design/icons'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  files: FileNode[]
  activePath: string | null
  currentDir: string
  onSelect: (path: string, type: 'file' | 'directory') => void
  onDelete: (path: string) => void
}

interface TreeNodeProps {
  node: FileNode
  activePath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onDelete: (path: string) => void
}

function TreeNode({ node, activePath, onSelect, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = React.useState(true)
  const isDirectory = node.type === 'directory'
  const isActive = node.path === activePath

  const handleClick = () => {
    if (isDirectory) {
      setExpanded(!expanded)
    }
    onSelect(node.path, isDirectory ? 'directory' : 'file')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`确定删除 ${node.name} 吗?`)) {
      onDelete(node.path)
    }
  }

  return (
    <div className="tree-node">
      <div
        className={`file-tree-item ${isActive ? 'active' : ''}`}
        onClick={handleClick}
      >
        <span className="tree-icon">
          {isDirectory ? (expanded ? <FolderOpenFilled /> : <FolderFilled />) : <FileFilled />}
        </span>
        <span className="tree-name">{node.name}</span>
        <button className="icon-btn tree-delete" onClick={handleDelete}>
          <DeleteOutlined />
        </button>
      </div>
      {isDirectory && expanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, activePath, currentDir, onSelect, onDelete }: FileTreeProps) {
  return (
    <div className="sidebar-content">
      {files.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-state-icon"><FolderOpenFilled /></div>
          <div>暂无文件</div>
        </div>
      ) : (
        files.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            activePath={activePath}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  )
}