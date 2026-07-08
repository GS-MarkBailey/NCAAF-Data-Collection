function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(text) {
  let out = escapeXml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = escapeXml(href)
    return `<a href="${safeHref}">${escapeXml(label)}</a>`
  })
  return out
}

function attachmentImage(filename, alt) {
  const safeName = escapeXml(filename)
  const altAttr = alt ? ` ac:alt="${escapeXml(alt)}"` : ''
  return `<ac:image ac:align="center" ac:layout="center" ac:width="900"${altAttr}><ri:attachment ri:filename="${safeName}" /></ac:image>`
}

function parseImageToken(token) {
  const match = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  if (!match) return null
  return { alt: match[1], href: match[2] }
}

function blockFromLine(line) {
  const images = []
  let rest = line.trim()

  while (rest.length > 0) {
    const imageMatch = rest.match(/^!\[[^\]]*\]\([^)]+\)/)
    if (imageMatch) {
      const parsed = parseImageToken(imageMatch[0])
      if (parsed) images.push(parsed)
      rest = rest.slice(imageMatch[0].length).trim()
      continue
    }
    break
  }

  if (images.length > 0 && rest.length === 0) {
    return { type: 'images', images }
  }

  if (images.length > 0) {
    return {
      type: 'mixed',
      images,
      text: rest,
    }
  }

  return { type: 'text', text: line }
}

function renderImages(images) {
  return images
    .map(({ alt, href }) => {
      if (/^https?:\/\//i.test(href)) {
        return `<p><a href="${escapeXml(href)}">${escapeXml(alt || href)}</a></p>`
      }
      return attachmentImage(href, alt)
    })
    .join('')
}

function renderBlock(block) {
  if (block.type === 'images') {
    return renderImages(block.images)
  }

  if (block.type === 'mixed') {
    return `<p>${inlineMarkdown(block.text)}</p>${renderImages(block.images)}`
  }

  return `<p>${inlineMarkdown(block.text)}</p>`
}

function isTableRow(line) {
  return line.trim().startsWith('|') && line.trim().endsWith('|')
}

function isTableDivider(line) {
  return /^\|\s*:?-{2,}/.test(line.trim())
}

function parseTableRow(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function renderTable(rows) {
  if (rows.length === 0) return ''

  const [header, ...body] = rows
  const headCells = header
    .map((cell) => `<th><p>${inlineMarkdown(cell)}</p></th>`)
    .join('')
  const bodyRows = body
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td><p>${inlineMarkdown(cell)}</p></td>`).join('')}</tr>`,
    )
    .join('')

  return `<table data-layout="default"><tbody><tr>${headCells}</tr>${bodyRows}</tbody></table>`
}

export function markdownToConfluenceStorage(markdown) {
  const lines = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !/^\s*<!--[\s\S]*?-->\s*$/.test(line.trim()))
    .filter((line) => !line.includes('<!-- AUTO-SNAPSHOTS:'))

  const out = []
  let listOpen = false
  let i = 0

  const closeList = () => {
    if (listOpen) {
      out.push('</ul>')
      listOpen = false
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      closeList()
      i += 1
      continue
    }

    if (trimmed === '---') {
      closeList()
      out.push('<hr />')
      i += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      closeList()
      out.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`)
      i += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      closeList()
      out.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`)
      i += 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      closeList()
      out.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`)
      i += 1
      continue
    }

    if (trimmed.startsWith('- ')) {
      if (!listOpen) {
        out.push('<ul>')
        listOpen = true
      }
      out.push(`<li><p>${inlineMarkdown(trimmed.slice(2))}</p></li>`)
      i += 1
      continue
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      closeList()
      out.push('<ol>')
      while (i < lines.length) {
        const numberedLine = lines[i].trim().match(/^\d+\.\s+(.*)$/)
        if (!numberedLine) break
        out.push(`<li><p>${inlineMarkdown(numberedLine[1])}</p></li>`)
        i += 1
      }
      out.push('</ol>')
      continue
    }

    if (isTableRow(line)) {
      closeList()
      const tableLines = []
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isTableDivider(lines[i])) {
          tableLines.push(parseTableRow(lines[i]))
        }
        i += 1
      }
      out.push(renderTable(tableLines))
      continue
    }

    closeList()
    const block = blockFromLine(line)
    out.push(renderBlock(block))
    i += 1
  }

  closeList()
  return out.join('')
}

export function markdownTitle(markdown) {
  const match = markdown.replace(/\r\n/g, '\n').match(/^#\s+(.+)$/m)
  return match?.[1]?.trim() ?? 'NCAAF Data Collection'
}
