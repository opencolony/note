import type { PlaygroundCase } from './types'
import { tabbarStylesCase } from './cases/tabbar-styles'
import { tabbarCompactCase } from './cases/tabbar-compact'
import { dirSwitcherStylesCase } from './cases/dir-switcher-styles'
import { emptyStateStylesCase } from './cases/empty-state-styles'
import { editDirDialogStylesCase } from './cases/edit-dir-dialog-styles'
import { addDirDialogStylesCase } from './cases/add-dir-dialog-styles'
import { addDirSearchStylesCase } from './cases/add-dir-search-styles'
import { fileItemMenuStylesCase } from './cases/file-item-menu-styles'

export const playgroundCases: PlaygroundCase[] = [tabbarStylesCase, tabbarCompactCase, dirSwitcherStylesCase, emptyStateStylesCase, editDirDialogStylesCase, addDirDialogStylesCase, addDirSearchStylesCase, fileItemMenuStylesCase]
