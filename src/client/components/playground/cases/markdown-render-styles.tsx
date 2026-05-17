import type { PlaygroundCase } from '../types'

// 全面示例内容 —— 覆盖所有 Markdown 语法
const SAMPLE_CONTENT = {
  h1: 'Markdown 渲染样式设计',
  h2: 'Typography 排版',
  h3: '标题层级',
  h4: '四级标题示例',
  paragraph1: '这是一段普通正文。Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档，然后转换成有效的 HTML 文档。它的设计目标是实现「易读易写」。',
  paragraph2: '在正文中可以包含 **粗体文字**、*斜体文字*、~~删除线文字~~、`行内代码`、以及 [外部链接](https://example.com)。',
  h2_list: '列表',
  h3_unordered: '无序列表',
  h3_ordered: '有序列表',
  h3_task: '任务列表',
  h2_blockquote: '引用块',
  h2_code: '代码',
  h2_table: '表格',
  h2_hr: '分隔线',
  h2_details: '折叠详情',
  h2_mixed: '混合元素',
}

const CODE_SAMPLE = `function greet(name: string): string {
  // 这是注释
  const message = \`Hello, \${name}!\`;
  return message;
}

console.log(greet('World'));`

const TABLE_ROWS = [
  { name: 'React', type: 'Frontend', stars: '220k+' },
  { name: 'Vue', type: 'Frontend', stars: '210k+' },
  { name: 'Node.js', type: 'Backend', stars: '105k+' },
]

// 通用容器
function MdContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-[680px] mx-auto bg-background text-foreground ${className}`}>
      {children}
    </div>
  )
}

// ========== 方案 A：经典学术风 ==========
// 特点：大标题对比强烈、经典衬线感、优雅的引用块、清晰层次
function StyleClassicAcademic() {
  return (
    <MdContainer className="px-6 py-8">
      {/* H1 */}
      <h1 className="text-[2.25rem] font-bold leading-tight mb-8 mt-0 tracking-tight"
          style={{ color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
        {SAMPLE_CONTENT.h1}
      </h1>

      {/* H2 */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2}
      </h2>

      {/* H3 */}
      <h3 className="text-[1.35rem] font-semibold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h3}
      </h3>

      {/* H4-H6 */}
      <h4 className="text-lg font-semibold mt-6 mb-2">{SAMPLE_CONTENT.h4}</h4>
      <h5 className="text-base font-semibold mt-5 mb-2">五级标题示例</h5>
      <h6 className="text-sm font-semibold mt-4 mb-2">六级标题示例</h6>

      {/* Paragraph */}
      <p className="text-[0.95rem] leading-[1.8] mb-5"
         style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.paragraph1}
      </p>
      <p className="text-[0.95rem] leading-[1.8] mb-5"
         style={{ color: 'var(--color-foreground)' }}>
        在正文中可以包含 <strong className="font-bold">粗体文字</strong>、
        <em className="italic">斜体文字</em>、
        <del className="line-through opacity-60">删除线文字</del>、
        <code className="px-1.5 py-0.5 rounded text-[0.85em] font-mono"
              style={{ background: 'var(--color-muted)', color: 'var(--color-primary)' }}>
          行内代码
        </code>、以及{' '}
        <a href="#" className="underline underline-offset-4 decoration-1"
           style={{ color: 'var(--color-primary)' }}>
          外部链接
        </a>。
      </p>

      {/* Lists */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_list}
      </h2>

      <h3 className="text-[1.35rem] font-semibold mt-8 mb-3">{SAMPLE_CONTENT.h3_unordered}</h3>
      <ul className="pl-6 mb-5 space-y-2"
          style={{ listStyleType: 'disc' }}>
        <li className="text-[0.95rem] leading-[1.7]"
            style={{ color: 'var(--color-foreground)' }}>
          第一项：支持嵌套结构
          <ul className="pl-5 mt-1.5 space-y-1.5" style={{ listStyleType: 'circle' }}>
            <li className="text-[0.92rem]">嵌套子项 A</li>
            <li className="text-[0.92rem]">嵌套子项 B</li>
          </ul>
        </li>
        <li className="text-[0.95rem] leading-[1.7]">第二项：简洁的语法</li>
        <li className="text-[0.95rem] leading-[1.7]">第三项：广泛的兼容性</li>
      </ul>

      <h3 className="text-[1.35rem] font-semibold mt-8 mb-3">{SAMPLE_CONTENT.h3_ordered}</h3>
      <ol className="pl-6 mb-5 space-y-2"
          style={{ listStyleType: 'decimal' }}>
        <li className="text-[0.95rem] leading-[1.7]">首先安装依赖包</li>
        <li className="text-[0.95rem] leading-[1.7]">然后配置参数</li>
        <li className="text-[0.95rem] leading-[1.7]">最后运行程序</li>
      </ol>

      <h3 className="text-[1.35rem] font-semibold mt-8 mb-3">{SAMPLE_CONTENT.h3_task}</h3>
      <ul className="pl-0 mb-5 space-y-2" style={{ listStyle: 'none' }}>
        <li className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7]">
          <input type="checkbox" checked readOnly className="mt-1.5 w-4 h-4 accent-primary shrink-0" />
          <span>已完成的事项</span>
        </li>
        <li className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7]">
          <input type="checkbox" readOnly className="mt-1.5 w-4 h-4 accent-primary shrink-0" />
          <span>待完成的事项</span>
        </li>
        <li className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7] line-through opacity-50">
          <input type="checkbox" checked readOnly className="mt-1.5 w-4 h-4 accent-primary shrink-0" />
          <span>已取消的事项</span>
        </li>
      </ul>

      {/* Blockquote */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_blockquote}
      </h2>
      <blockquote className="pl-5 py-4 pr-4 my-6 rounded-r-lg italic"
                  style={{
                    borderLeft: '4px solid var(--color-primary)',
                    background: 'linear-gradient(90deg, color-mix(in oklch, var(--color-primary) 5%, transparent) 0%, transparent 100%)'
                  }}>
        <p className="m-0 text-[0.95rem] leading-[1.8]"
           style={{ color: 'var(--color-foreground)' }}>
          「简单是终极的复杂。」—— 达·芬奇
        </p>
        <p className="m-0 mt-3 text-[0.9rem] leading-[1.7] opacity-75">
          这句话完美诠释了 Markdown 的设计哲学。用最少的符号，表达最丰富的语义。
        </p>
      </blockquote>

      {/* Code Block */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_code}
      </h2>
      <pre className="p-5 my-6 rounded-lg overflow-x-auto text-[0.875rem] leading-[1.7] font-mono"
           style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
        <code style={{ color: 'var(--color-foreground)' }}>{CODE_SAMPLE}</code>
      </pre>

      {/* Table */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_table}
      </h2>
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse text-[0.9rem]"
               style={{ border: '1px solid var(--color-border)' }}>
          <thead>
            <tr style={{ background: 'var(--color-muted)' }}>
              <th className="px-4 py-2.5 text-left font-bold border"
                  style={{ borderColor: 'var(--color-border)' }}>名称</th>
              <th className="px-4 py-2.5 text-left font-bold border"
                  style={{ borderColor: 'var(--color-border)' }}>类型</th>
              <th className="px-4 py-2.5 text-left font-bold border"
                  style={{ borderColor: 'var(--color-border)' }}>Stars</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-muted)' }}>
                <td className="px-4 py-2.5 border" style={{ borderColor: 'var(--color-border)' }}>{row.name}</td>
                <td className="px-4 py-2.5 border" style={{ borderColor: 'var(--color-border)' }}>{row.type}</td>
                <td className="px-4 py-2.5 border" style={{ borderColor: 'var(--color-border)' }}>{row.stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HR */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_hr}
      </h2>
      <hr className="my-8 border-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 0%, var(--color-border) 50%, transparent 100%)' }} />

      {/* Details */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_details}
      </h2>
      <details className="my-6 rounded-lg border overflow-hidden"
               style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
        <summary className="px-5 py-3 font-medium cursor-pointer select-none flex items-center gap-2 hover:opacity-80 transition-opacity"
                 style={{ background: 'color-mix(in oklch, var(--color-muted) 70%, transparent)' }}>
          <span className="text-xs text-muted-foreground">▶</span>
          点击展开详细信息
        </summary>
        <div className="px-5 py-4 text-[0.95rem] leading-[1.7]">
          这是折叠区域的内容。可以放置额外的说明、注意事项或补充信息。
        </div>
      </details>

      {/* Mixed */}
      <h2 className="text-[1.75rem] font-bold mt-12 mb-5 pb-2 border-b-2"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h2_mixed}
      </h2>
      <p className="text-[0.95rem] leading-[1.8] mb-4">
        使用 <kbd className="px-2 py-0.5 text-xs font-mono rounded border shadow-sm"
                 style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+C</kbd>{' '}
        复制，<kbd className="px-2 py-0.5 text-xs font-mono rounded border shadow-sm"
                   style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+V</kbd>{' '}
        粘贴。高亮文字：<mark className="px-1 rounded"
                            style={{ background: 'var(--color-highlight)' }}>重要提示</mark>
      </p>
      <p className="text-[0.95rem] leading-[1.8] mb-4">
        化学公式：H<sub className="text-xs">2</sub>O，数学公式：E=mc<sup className="text-xs">2</sup>
      </p>
    </MdContainer>
  )
}

// ========== 方案 B：现代卡片风 ==========
// 特点：代码块和引用用卡片包裹、圆角阴影、更现代的设计感、较大的间距
function StyleModernCards() {
  return (
    <MdContainer className="px-6 py-8">
      {/* H1 */}
      <h1 className="text-[2.5rem] font-extrabold leading-[1.1] mb-10 mt-0"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h1}
      </h1>

      {/* H2 */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2}
      </h2>

      {/* H3 */}
      <h3 className="text-[1.25rem] font-semibold mt-8 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full inline-block"
              style={{ background: 'var(--color-primary)' }} />
        {SAMPLE_CONTENT.h3}
      </h3>

      {/* H4-H6 */}
      <h4 className="text-lg font-semibold mt-6 mb-2">{SAMPLE_CONTENT.h4}</h4>
      <h5 className="text-base font-semibold mt-5 mb-2">五级标题示例</h5>
      <h6 className="text-sm font-semibold mt-4 mb-2">六级标题示例</h6>

      {/* Paragraph */}
      <p className="text-[0.95rem] leading-[1.75] mb-5"
         style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.paragraph1}
      </p>
      <p className="text-[0.95rem] leading-[1.75] mb-5"
         style={{ color: 'var(--color-foreground)' }}>
        在正文中可以包含 <strong className="font-bold">粗体文字</strong>、
        <em className="italic">斜体文字</em>、
        <del className="line-through opacity-60">删除线文字</del>、
        <code className="px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border"
              style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
          行内代码
        </code>、以及{' '}
        <a href="#" className="underline underline-offset-2 font-medium"
           style={{ color: 'var(--color-primary)' }}>
          外部链接
        </a>。
      </p>

      {/* Lists */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_list}
      </h2>

      <h3 className="text-[1.25rem] font-semibold mt-8 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full inline-block"
              style={{ background: 'var(--color-primary)' }} />
        {SAMPLE_CONTENT.h3_unordered}
      </h3>
      <ul className="pl-6 mb-5 space-y-2.5"
          style={{ listStyleType: 'disc' }}>
        <li className="text-[0.95rem] leading-[1.7]"
            style={{ color: 'var(--color-foreground)' }}>
          第一项：支持嵌套结构
          <ul className="pl-5 mt-2 space-y-1.5" style={{ listStyleType: 'circle' }}>
            <li className="text-[0.92rem]">嵌套子项 A</li>
            <li className="text-[0.92rem]">嵌套子项 B</li>
          </ul>
        </li>
        <li className="text-[0.95rem] leading-[1.7]">第二项：简洁的语法</li>
        <li className="text-[0.95rem] leading-[1.7]">第三项：广泛的兼容性</li>
      </ul>

      <h3 className="text-[1.25rem] font-semibold mt-8 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full inline-block"
              style={{ background: 'var(--color-primary)' }} />
        {SAMPLE_CONTENT.h3_ordered}
      </h3>
      <ol className="pl-6 mb-5 space-y-2.5"
          style={{ listStyleType: 'decimal' }}>
        <li className="text-[0.95rem] leading-[1.7]">首先安装依赖包</li>
        <li className="text-[0.95rem] leading-[1.7]">然后配置参数</li>
        <li className="text-[0.95rem] leading-[1.7]">最后运行程序</li>
      </ol>

      <h3 className="text-[1.25rem] font-semibold mt-8 mb-3 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full inline-block"
              style={{ background: 'var(--color-primary)' }} />
        {SAMPLE_CONTENT.h3_task}
      </h3>
      <div className="rounded-lg border p-4 mb-5 space-y-2.5"
           style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
        <label className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7] cursor-pointer">
          <input type="checkbox" checked readOnly className="mt-1 w-4 h-4 accent-primary shrink-0" />
          <span>已完成的事项</span>
        </label>
        <label className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7] cursor-pointer">
          <input type="checkbox" readOnly className="mt-1 w-4 h-4 accent-primary shrink-0" />
          <span>待完成的事项</span>
        </label>
        <label className="flex items-start gap-2.5 text-[0.95rem] leading-[1.7] cursor-pointer line-through opacity-50">
          <input type="checkbox" checked readOnly className="mt-1 w-4 h-4 accent-primary shrink-0" />
          <span>已取消的事项</span>
        </label>
      </div>

      {/* Blockquote — 卡片式 */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_blockquote}
      </h2>
      <div className="my-6 rounded-xl p-5 border"
           style={{
             borderColor: 'color-mix(in oklch, var(--color-primary) 20%, var(--color-border))',
             background: 'color-mix(in oklch, var(--color-primary) 4%, var(--color-background))',
             boxShadow: '0 1px 3px oklch(0% 0 0 / 0.05)'
           }}>
        <div className="text-3xl leading-none mb-2 opacity-30" style={{ color: 'var(--color-primary)' }}>"</div>
        <p className="text-[0.95rem] leading-[1.8] -mt-4 pl-2"
           style={{ color: 'var(--color-foreground)' }}>
          简单是终极的复杂。—— 达·芬奇
        </p>
        <p className="text-[0.9rem] leading-[1.7] mt-3 pl-2 opacity-70">
          这句话完美诠释了 Markdown 的设计哲学。用最少的符号，表达最丰富的语义。
        </p>
      </div>

      {/* Code Block — 卡片式 */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_code}
      </h2>
      <div className="my-6 rounded-xl overflow-hidden border"
           style={{ borderColor: 'var(--color-border)', boxShadow: '0 4px 6px -1px oklch(0% 0 0 / 0.05)' }}>
        <div className="px-4 py-2 flex items-center gap-1.5"
             style={{ background: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          <span className="ml-2 text-xs text-muted-foreground font-mono">typescript</span>
        </div>
        <pre className="p-5 overflow-x-auto text-[0.875rem] leading-[1.7] font-mono m-0"
             style={{ background: 'var(--color-background)' }}>
          <code style={{ color: 'var(--color-foreground)' }}>{CODE_SAMPLE}</code>
        </pre>
      </div>

      {/* Table */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_table}
      </h2>
      <div className="overflow-x-auto my-6 rounded-xl border"
           style={{ borderColor: 'var(--color-border)', boxShadow: '0 1px 3px oklch(0% 0 0 / 0.05)' }}>
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr style={{ background: 'var(--color-muted)' }}>
              <th className="px-4 py-3 text-left font-bold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>名称</th>
              <th className="px-4 py-3 text-left font-bold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>类型</th>
              <th className="px-4 py-3 text-left font-bold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>Stars</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={i} className="border-b transition-colors hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-muted)' }}>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.type}</td>
                <td className="px-4 py-3">{row.stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HR */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_hr}
      </h2>
      <div className="flex items-center gap-3 my-8">
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        <div className="w-2 h-2 rotate-45"
             style={{ background: 'var(--color-border)' }} />
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      </div>

      {/* Details */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_details}
      </h2>
      <details className="my-6 rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-border)', boxShadow: '0 1px 3px oklch(0% 0 0 / 0.05)' }}>
        <summary className="px-5 py-3.5 font-medium cursor-pointer select-none flex items-center gap-2 hover:bg-muted/50 transition-colors"
                 style={{ background: 'var(--color-muted)' }}>
          <span className="text-xs transition-transform">▶</span>
          点击展开详细信息
        </summary>
        <div className="px-5 py-4 text-[0.95rem] leading-[1.7]">
          这是折叠区域的内容。可以放置额外的说明、注意事项或补充信息。
        </div>
      </details>

      {/* Mixed */}
      <h2 className="text-[1.5rem] font-bold mt-10 mb-4 px-3 py-1 rounded-md inline-block"
          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_mixed}
      </h2>
      <p className="text-[0.95rem] leading-[1.75] mb-4">
        使用 <kbd className="px-2 py-0.5 text-xs font-mono rounded-md border shadow-sm"
                 style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+C</kbd>{' '}
        复制，<kbd className="px-2 py-0.5 text-xs font-mono rounded-md border shadow-sm"
                   style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+V</kbd>{' '}
        粘贴。高亮文字：<mark className="px-1.5 py-0.5 rounded-md"
                            style={{ background: 'var(--color-highlight)' }}>重要提示</mark>
      </p>
      <p className="text-[0.95rem] leading-[1.75] mb-4">
        化学公式：H<sub className="text-xs">2</sub>O，数学公式：E=mc<sup className="text-xs">2</sup>
      </p>
    </MdContainer>
  )
}

// ========== 方案 C：紧凑工程风 ==========
// 特点：更小的间距、紧凑代码块、类似技术文档/Readme 风格、高信息密度
function StyleCompactEngineering() {
  return (
    <MdContainer className="px-5 py-6">
      {/* H1 */}
      <h1 className="text-[1.75rem] font-bold leading-tight mb-6 mt-0 pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
        {SAMPLE_CONTENT.h1}
      </h1>

      {/* H2 */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2}
      </h2>

      {/* H3 */}
      <h3 className="text-base font-semibold mt-6 mb-2"
          style={{ color: 'var(--color-primary)' }}>
        {SAMPLE_CONTENT.h3}
      </h3>

      {/* H4-H6 */}
      <h4 className="text-sm font-semibold mt-5 mb-1.5">{SAMPLE_CONTENT.h4}</h4>
      <h5 className="text-sm font-semibold mt-4 mb-1.5">五级标题示例</h5>
      <h6 className="text-xs font-semibold mt-3 mb-1.5">六级标题示例</h6>

      {/* Paragraph */}
      <p className="text-[0.9rem] leading-[1.65] mb-3"
         style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.paragraph1}
      </p>
      <p className="text-[0.9rem] leading-[1.65] mb-3"
         style={{ color: 'var(--color-foreground)' }}>
        在正文中可以包含 <strong className="font-bold">粗体文字</strong>、
        <em className="italic">斜体文字</em>、
        <del className="line-through opacity-50">删除线文字</del>、
        <code className="px-1 py-px rounded text-[0.8em] font-mono"
              style={{ background: 'var(--color-muted)', color: 'var(--color-primary)' }}>
          行内代码
        </code>、以及{' '}
        <a href="#" className="underline underline-offset-2"
           style={{ color: 'var(--color-primary)' }}>
          外部链接
        </a>。
      </p>

      {/* Lists */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_list}
      </h2>

      <h3 className="text-base font-semibold mt-5 mb-2"
          style={{ color: 'var(--color-primary)' }}>
        {SAMPLE_CONTENT.h3_unordered}
      </h3>
      <ul className="pl-5 mb-3 space-y-1"
          style={{ listStyleType: 'disc' }}>
        <li className="text-[0.9rem] leading-[1.6]"
            style={{ color: 'var(--color-foreground)' }}>
          第一项：支持嵌套结构
          <ul className="pl-4 mt-1 space-y-0.5" style={{ listStyleType: 'circle' }}>
            <li className="text-[0.88rem]">嵌套子项 A</li>
            <li className="text-[0.88rem]">嵌套子项 B</li>
          </ul>
        </li>
        <li className="text-[0.9rem] leading-[1.6]">第二项：简洁的语法</li>
        <li className="text-[0.9rem] leading-[1.6]">第三项：广泛的兼容性</li>
      </ul>

      <h3 className="text-base font-semibold mt-5 mb-2"
          style={{ color: 'var(--color-primary)' }}>
        {SAMPLE_CONTENT.h3_ordered}
      </h3>
      <ol className="pl-5 mb-3 space-y-1"
          style={{ listStyleType: 'decimal' }}>
        <li className="text-[0.9rem] leading-[1.6]">首先安装依赖包</li>
        <li className="text-[0.9rem] leading-[1.6]">然后配置参数</li>
        <li className="text-[0.9rem] leading-[1.6]">最后运行程序</li>
      </ol>

      <h3 className="text-base font-semibold mt-5 mb-2"
          style={{ color: 'var(--color-primary)' }}>
        {SAMPLE_CONTENT.h3_task}
      </h3>
      <ul className="pl-0 mb-3 space-y-1" style={{ listStyle: 'none' }}>
        <li className="flex items-start gap-2 text-[0.9rem] leading-[1.6]">
          <input type="checkbox" checked readOnly className="mt-1 w-3.5 h-3.5 accent-primary shrink-0" />
          <span>已完成的事项</span>
        </li>
        <li className="flex items-start gap-2 text-[0.9rem] leading-[1.6]">
          <input type="checkbox" readOnly className="mt-1 w-3.5 h-3.5 accent-primary shrink-0" />
          <span>待完成的事项</span>
        </li>
        <li className="flex items-start gap-2 text-[0.9rem] leading-[1.6] line-through opacity-50">
          <input type="checkbox" checked readOnly className="mt-1 w-3.5 h-3.5 accent-primary shrink-0" />
          <span>已取消的事项</span>
        </li>
      </ul>

      {/* Blockquote */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_blockquote}
      </h2>
      <blockquote className="pl-3 py-2 pr-3 my-4 border-l-2"
                  style={{ borderColor: 'var(--color-primary)', background: 'var(--color-muted)' }}>
        <p className="m-0 text-[0.9rem] leading-[1.65]"
           style={{ color: 'var(--color-foreground)' }}>
          「简单是终极的复杂。」—— 达·芬奇
        </p>
        <p className="m-0 mt-2 text-[0.88rem] leading-[1.6] opacity-70">
          这句话完美诠释了 Markdown 的设计哲学。用最少的符号，表达最丰富的语义。
        </p>
      </blockquote>

      {/* Code Block */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_code}
      </h2>
      <pre className="p-3 my-4 overflow-x-auto text-[0.8125rem] leading-[1.6] font-mono rounded-md"
           style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
        <code style={{ color: 'var(--color-foreground)' }}>{CODE_SAMPLE}</code>
      </pre>

      {/* Table */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_table}
      </h2>
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-[0.85rem]"
               style={{ border: '1px solid var(--color-border)' }}>
          <thead>
            <tr style={{ background: 'var(--color-muted)' }}>
              <th className="px-3 py-1.5 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>名称</th>
              <th className="px-3 py-1.5 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>类型</th>
              <th className="px-3 py-1.5 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>Stars</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-3 py-1.5">{row.name}</td>
                <td className="px-3 py-1.5">{row.type}</td>
                <td className="px-3 py-1.5">{row.stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HR */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_hr}
      </h2>
      <hr className="my-6 border-0 h-px"
          style={{ background: 'var(--color-border)' }} />

      {/* Details */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_details}
      </h2>
      <details className="my-4 rounded border overflow-hidden"
               style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
        <summary className="px-3 py-2 text-sm font-medium cursor-pointer select-none flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-[10px] text-muted-foreground">▶</span>
          点击展开详细信息
        </summary>
        <div className="px-3 py-2 text-[0.9rem] leading-[1.65] border-t"
             style={{ borderColor: 'var(--color-border)' }}>
          这是折叠区域的内容。可以放置额外的说明、注意事项或补充信息。
        </div>
      </details>

      {/* Mixed */}
      <h2 className="text-[1.25rem] font-bold mt-8 mb-3"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_mixed}
      </h2>
      <p className="text-[0.9rem] leading-[1.65] mb-3">
        使用 <kbd className="px-1.5 py-px text-[11px] font-mono rounded border"
                 style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+C</kbd>{' '}
        复制，<kbd className="px-1.5 py-px text-[11px] font-mono rounded border"
                   style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+V</kbd>{' '}
        粘贴。高亮：<mark className="px-1 rounded" style={{ background: 'var(--color-highlight)' }}>重要提示</mark>
      </p>
      <p className="text-[0.9rem] leading-[1.65] mb-3">
        化学公式：H<sub className="text-[10px]">2</sub>O，数学公式：E=mc<sup className="text-[10px]">2</sup>
      </p>
    </MdContainer>
  )
}

// ========== 方案 D：杂志编辑风 ==========
// 特点：大标题小正文、宽行距、优雅的排版、像 Medium/Notion 风格、大量留白
function StyleMagazineEditorial() {
  return (
    <MdContainer className="px-8 py-10">
      {/* H1 */}
      <h1 className="text-[3rem] font-bold leading-[1.05] mb-10 mt-0"
          style={{ color: 'var(--color-foreground)', letterSpacing: '-0.03em' }}>
        {SAMPLE_CONTENT.h1}
      </h1>

      {/* H2 */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2}
      </h2>

      {/* H3 */}
      <h3 className="text-lg font-medium mt-10 mb-3 opacity-80">
        {SAMPLE_CONTENT.h3}
      </h3>

      {/* H4-H6 */}
      <h4 className="text-base font-medium mt-7 mb-2">{SAMPLE_CONTENT.h4}</h4>
      <h5 className="text-sm font-medium mt-6 mb-2">五级标题示例</h5>
      <h6 className="text-xs font-medium mt-5 mb-2 opacity-70">六级标题示例</h6>

      {/* Paragraph */}
      <p className="text-[1.05rem] leading-[1.9] mb-6"
         style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.paragraph1}
      </p>
      <p className="text-[1.05rem] leading-[1.9] mb-6"
         style={{ color: 'var(--color-foreground)' }}>
        在正文中可以包含 <strong className="font-bold">粗体文字</strong>、
        <em className="italic">斜体文字</em>、
        <del className="line-through opacity-50">删除线文字</del>、
        <code className="px-1.5 py-px rounded text-[0.85em] font-mono"
              style={{ background: 'var(--color-muted)', color: 'var(--color-primary)' }}>
          行内代码
        </code>、以及{' '}
        <a href="#" className="underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
           style={{ color: 'var(--color-primary)' }}>
          外部链接
        </a>。
      </p>

      {/* Lists */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_list}
      </h2>

      <h3 className="text-lg font-medium mt-10 mb-3 opacity-80">
        {SAMPLE_CONTENT.h3_unordered}
      </h3>
      <ul className="pl-6 mb-6 space-y-3"
          style={{ listStyleType: 'disc' }}>
        <li className="text-[1.05rem] leading-[1.8]"
            style={{ color: 'var(--color-foreground)' }}>
          第一项：支持嵌套结构
          <ul className="pl-5 mt-2 space-y-2" style={{ listStyleType: 'circle' }}>
            <li className="text-[0.98rem]">嵌套子项 A</li>
            <li className="text-[0.98rem]">嵌套子项 B</li>
          </ul>
        </li>
        <li className="text-[1.05rem] leading-[1.8]">第二项：简洁的语法</li>
        <li className="text-[1.05rem] leading-[1.8]">第三项：广泛的兼容性</li>
      </ul>

      <h3 className="text-lg font-medium mt-10 mb-3 opacity-80">
        {SAMPLE_CONTENT.h3_ordered}
      </h3>
      <ol className="pl-6 mb-6 space-y-3"
          style={{ listStyleType: 'decimal' }}>
        <li className="text-[1.05rem] leading-[1.8]">首先安装依赖包</li>
        <li className="text-[1.05rem] leading-[1.8]">然后配置参数</li>
        <li className="text-[1.05rem] leading-[1.8]">最后运行程序</li>
      </ol>

      <h3 className="text-lg font-medium mt-10 mb-3 opacity-80">
        {SAMPLE_CONTENT.h3_task}
      </h3>
      <ul className="pl-0 mb-6 space-y-3" style={{ listStyle: 'none' }}>
        <li className="flex items-start gap-3 text-[1.05rem] leading-[1.8]">
          <input type="checkbox" checked readOnly className="mt-2 w-4 h-4 accent-primary shrink-0" />
          <span>已完成的事项</span>
        </li>
        <li className="flex items-start gap-3 text-[1.05rem] leading-[1.8]">
          <input type="checkbox" readOnly className="mt-2 w-4 h-4 accent-primary shrink-0" />
          <span>待完成的事项</span>
        </li>
        <li className="flex items-start gap-3 text-[1.05rem] leading-[1.8] line-through opacity-50">
          <input type="checkbox" checked readOnly className="mt-2 w-4 h-4 accent-primary shrink-0" />
          <span>已取消的事项</span>
        </li>
      </ul>

      {/* Blockquote */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_blockquote}
      </h2>
      <blockquote className="pl-6 py-5 pr-5 my-8 rounded-lg"
                  style={{
                    borderLeft: '3px solid var(--color-primary)',
                    background: 'var(--color-muted)'
                  }}>
        <p className="m-0 text-[1.125rem] leading-[1.8] font-medium"
           style={{ color: 'var(--color-foreground)' }}>
          简单是终极的复杂。
        </p>
        <p className="m-0 mt-2 text-sm opacity-60">
          —— 达·芬奇
        </p>
        <p className="m-0 mt-4 text-[0.95rem] leading-[1.8] opacity-75">
          这句话完美诠释了 Markdown 的设计哲学。用最少的符号，表达最丰富的语义。
        </p>
      </blockquote>

      {/* Code Block */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_code}
      </h2>
      <pre className="p-6 my-8 rounded-xl overflow-x-auto text-[0.875rem] leading-[1.75] font-mono"
           style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
        <code style={{ color: 'var(--color-foreground)' }}>{CODE_SAMPLE}</code>
      </pre>

      {/* Table */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_table}
      </h2>
      <div className="overflow-x-auto my-8">
        <table className="w-full border-collapse text-[0.95rem]"
               style={{ border: '1px solid var(--color-border)' }}>
          <thead>
            <tr style={{ background: 'var(--color-muted)' }}>
              <th className="px-5 py-3 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>名称</th>
              <th className="px-5 py-3 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>类型</th>
              <th className="px-5 py-3 text-left font-semibold border-b"
                  style={{ borderColor: 'var(--color-border)' }}>Stars</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="px-5 py-3">{row.name}</td>
                <td className="px-5 py-3">{row.type}</td>
                <td className="px-5 py-3">{row.stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HR */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_hr}
      </h2>
      <hr className="my-10 border-0"
          style={{
            height: '2px',
            background: 'repeating-linear-gradient(90deg, var(--color-border) 0, var(--color-border) 4px, transparent 4px, transparent 8px)'
          }} />

      {/* Details */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_details}
      </h2>
      <details className="my-8 rounded-lg border overflow-hidden"
               style={{ borderColor: 'var(--color-border)' }}>
        <summary className="px-5 py-3.5 font-medium cursor-pointer select-none flex items-center gap-2 hover:bg-muted/30 transition-colors"
                 style={{ background: 'var(--color-muted)' }}>
          <span className="text-xs text-muted-foreground transition-transform">▶</span>
          点击展开详细信息
        </summary>
        <div className="px-5 py-4 text-[1.05rem] leading-[1.8]">
          这是折叠区域的内容。可以放置额外的说明、注意事项或补充信息。
        </div>
      </details>

      {/* Mixed */}
      <h2 className="text-[1.375rem] font-semibold mt-14 mb-4"
          style={{ color: 'var(--color-foreground)' }}>
        {SAMPLE_CONTENT.h2_mixed}
      </h2>
      <p className="text-[1.05rem] leading-[1.9] mb-5">
        使用 <kbd className="px-2 py-0.5 text-xs font-mono rounded border shadow-sm"
                 style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+C</kbd>{' '}
        复制，<kbd className="px-2 py-0.5 text-xs font-mono rounded border shadow-sm"
                   style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>Ctrl+V</kbd>{' '}
        粘贴。高亮文字：<mark className="px-1 rounded"
                            style={{ background: 'var(--color-highlight)' }}>重要提示</mark>
      </p>
      <p className="text-[1.05rem] leading-[1.9] mb-5">
        化学公式：H<sub className="text-xs">2</sub>O，数学公式：E=mc<sup className="text-xs">2</sup>
      </p>
    </MdContainer>
  )
}

export const markdownRenderStylesCase: PlaygroundCase = {
  id: 'markdown-render-styles',
  name: 'Markdown 正文渲染样式',
  description: '重新设计 Markdown 正文的渲染视觉效果，覆盖标题、段落、列表、引用、代码、表格等全部语法元素',
  variants: [
    {
      name: '方案 A：经典学术风',
      description: '大标题对比强烈、经典优雅引用块、清晰层级、充分留白，适合长文阅读',
      component: <StyleClassicAcademic />,
    },
    {
      name: '方案 B：现代卡片风',
      description: '代码块和引用用卡片包裹、圆角阴影、标签式 H2 标题，现代 UI 设计感',
      component: <StyleModernCards />,
    },
    {
      name: '方案 C：紧凑工程风',
      description: '更小间距、高信息密度、简洁代码块，类似技术文档和 README 风格',
      component: <StyleCompactEngineering />,
    },
    {
      name: '方案 D：杂志编辑风',
      description: '大标题小正文、宽行距、大量留白，像 Medium / Notion 的编辑阅读体验',
      component: <StyleMagazineEditorial />,
    },
  ],
}
