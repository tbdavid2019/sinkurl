import fs from 'node:fs'
import process from 'node:process'

const files = process.argv.slice(2)
if (files.length === 0) {
  process.exit(0)
}

let hasError = false

// Matches file:/// links in markdown:
// 1. Markdown link targets: [text](file:///...)
// 2. HTML href/src: href="file:///..." or src="file:///..."
// 3. Raw unquoted local paths: file:///Users/... or file:///home/... (outside backticks)
const LINK_REGEX = /\]\((file:\/\/\/[^)]+)\)/i
const HTML_REGEX = /(?:href|src)=["'](file:\/\/\/[^"']+)["']/i
const BARE_LOCAL_URI_REGEX = /(?<!`)(file:\/\/\/(?:Users|home|[a-z]:)[^\s`)]+)/i

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue
  }
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')

  let inCodeBlock = false

  lines.forEach((line, index) => {
    // Toggle multi-line code block state (``` or ~~~)
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      return
    }

    // Skip lines inside fenced code blocks
    if (inCodeBlock) {
      return
    }

    // Strip inline backtick code snippets to avoid false positives in documentation
    const cleanedLine = line.replace(/`[^`]*`/g, '')

    const match = line.match(LINK_REGEX) || line.match(HTML_REGEX) || cleanedLine.match(BARE_LOCAL_URI_REGEX)
    if (match) {
      console.error(`❌ [Local File URI Detected] ${file}:${index + 1}`)
      console.error(`   ${line.trim()}`)
      hasError = true
    }
  })
}

if (hasError) {
  console.error('\n🚨 Commit rejected: Please use relative paths instead of absolute file:/// URIs in Markdown files.\n')
  process.exit(1)
}
