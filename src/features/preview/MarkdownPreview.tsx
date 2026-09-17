import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface MarkdownPreviewProps {
  content: string
}

const components: Components = {
  a: ({ href, children, ...props }) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href)
    return (
      <a
        {...props}
        href={href}
        rel="noreferrer"
        target={isExternal ? '_blank' : undefined}
      >
        {children}
      </a>
    )
  },
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
