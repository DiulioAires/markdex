import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectHome } from './ProjectHome'
import type { ProjectEntry } from '../../types/project'

const project: ProjectEntry = {
  info: { name: 'Docs', rootPath: 'C:/docs' },
  tree: [
    {
      kind: 'file',
      name: 'README.md',
      path: 'C:/docs/README.md',
      relativePath: 'README.md',
      modifiedAt: 10,
    },
  ],
  isExpanded: true,
  isLoadingTree: false,
  treeError: null,
}

describe('ProjectHome', () => {
  it('shows recent and all markdown sections and opens a catalog file', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    render(<ProjectHome project={project} onOpenFile={onOpenFile} />)

    expect(screen.getByRole('heading', { name: 'Editados recentemente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Todos os arquivos Markdown' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir README.md' }))
    expect(onOpenFile).toHaveBeenCalledWith(project.tree[0])
  })

  it('filters the catalog by path', async () => {
    const user = userEvent.setup()
    render(<ProjectHome project={project} onOpenFile={() => {}} />)
    await user.type(screen.getByRole('searchbox', { name: 'Filtrar arquivos Markdown' }), 'missing')
    expect(screen.getByText('Nenhum arquivo corresponde ao filtro.')).toBeInTheDocument()
  })
})
