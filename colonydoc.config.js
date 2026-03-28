import markdownExtensions from 'markdown-extensions'

export default {
  root: process.cwd(),
  port: 5787,
  host: '0.0.0.0',
  allowedExtensions: markdownExtensions.map(ext => `.${ext}`),
  theme: {
    default: 'system',
  },
  editor: {
    autosave: true,
    debounceMs: 300,
  },
}