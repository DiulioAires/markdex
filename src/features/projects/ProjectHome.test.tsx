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
  it('shows an indeterminate loading bar while the project tree is being scanned', () => {
    render(
      <ProjectHome
        project={{ ...project, tree: [], isLoadingTree: true }}
        onOpenFile={() => {}}
        onRefresh={() => {}}
      />,
    )

    expect(screen.getByRole('progressbar', { name: 'Carregando arquivos Markdown de Docs' })).toBeInTheDocument()
    expect(screen.getByText('Carregando arquivos de Docs…')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum arquivo corresponde ao filtro.')).not.toBeInTheDocument()
  })

  it('offers a manual retry when the tree scan fails', async () => {
    const onRefresh = vi.fn()
    const user = userEvent.setup()
    render(
      <ProjectHome
        project={{ ...project, tree: [], treeError: 'Falha ao listar diretório' }}
        onOpenFile={() => {}}
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByText('Falha ao listar diretório')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('shows recent and all markdown sections and opens a catalog file', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    render(<ProjectHome project={project} onOpenFile={onOpenFile} onRefresh={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Editados recentemente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Todos os arquivos Markdown' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir README.md' }))
    expect(onOpenFile).toHaveBeenCalledWith(project.tree[0])
  })

  it('filters the catalog by path', async () => {
    const user = userEvent.setup()
    render(<ProjectHome project={project} onOpenFile={() => {}} onRefresh={() => {}} />)
    await user.type(screen.getByRole('searchbox', { name: 'Filtrar arquivos Markdown' }), 'missing')
    expect(screen.getByText('Nenhum arquivo corresponde ao filtro.')).toBeInTheDocument()
  })
})
