import Slate from 'slate'
import Paragraph from '../Paragraph'
import { isWithinTable } from '../Table'
import { getTableInfo, insertColumn, insertRow, moveTo } from './Actions'

const flow = (functions, startWith) => (
  functions.reduce((value, fn) => fn(value), startWith)
)

function onDelete(transform, event, data, state) {
  const { startBlock, startOffset, isCollapsed, endBlock } = state

  if (startBlock === endBlock && event.ctrlKey && event.shiftKey) {
    // Clear cell contents
    const range = Slate.Selection.create().moveToRangeOf(startBlock)
    return transform.deleteAtRange(range).collapseToStartOf(startBlock).apply()
  }

  if (startOffset === 0 && isCollapsed) {
    event.preventDefault()
    return undefined
  }
  if (startBlock === endBlock) return undefined

  event.preventDefault()

  const { blocks, focusBlock } = state
  return flow([
    t => blocks.reduce((result, block) => {
      if (block.type !== 'td') return result
      const range = Slate.Selection.create().moveToRangeOf(block)
      return result.deleteAtRange(range)
    }, t),
    t => t.collapseToStartOf(focusBlock),
  ], transform).apply()
}

function onDown(transform, event, data, state) {
  event.preventDefault()
  const { x, y, height, table } = getTableInfo({ state })

  if (event.ctrlKey && event.shiftKey) {
    return flow([
      t => insertRow(t, 'below'),
      t => moveTo(t, x, y + 1),
    ], transform)
  }

  if (y === height - 1) { // Last Row - move out of table
    let sibling = state.document.getNextSibling(table.key)
    let t = transform

    if (!sibling) {
      const parent = state.document.getParent(table.key)
      const tableIndex = parent.nodes.findIndex(n => n === table)

      sibling = Paragraph.create()
      t = t.insertNodeByKey(parent.key, tableIndex + 1, sibling)
    }

    return t.collapseToStartOf(sibling).moveOffsetsTo(0)
  }

  return moveTo(transform, x, y + 1)
}

function onEnter(transform, event, data, state) {
  event.preventDefault()
  const { x, y, height } = getTableInfo({ state })

  if (y === height - 1) { // last row
    return flow([
      t => insertRow(t, 'after'),
      t => moveTo(t, x, y + 1),
    ], transform)
  }

  return moveTo(transform, x, y + 1)
}

function onLeft(transform, event, data, state) {
  if (event.ctrlKey && event.shiftKey) {
    const { x, y } = getTableInfo({ state })
    return flow([
      t => insertColumn(t, 'left'),
      t => moveTo(t, x, y),
    ], transform)
  }

  return transform
}

function onRight(transform, event, data, state) {
  if (event.ctrlKey && event.shiftKey) {
    const { x, y } = getTableInfo({ state })
    return flow([
      t => insertColumn(t, 'right'),
      t => moveTo(t, x + 1, y),
    ], transform)
  }

  return transform
}

function onTab(transform, event, data, state) {
  event.preventDefault()
  const { x, y, height, width } = getTableInfo({ state })

  if (x === width - 1 && y === height - 1) {
    // bottom-right corner
    return flow([
      t => insertRow(t, 'after'),
      t => moveTo(t, 0, y + 1),
    ], transform)
  }

  const toX = x < width - 1 ? x + 1 : 0
  const toY = x === 0 ? y + 1 : y

  return moveTo(transform, toX, toY)
}

function onUp(transform, event, data, state) {
  event.preventDefault()
  const { x, y, table } = getTableInfo({ state })

  if (event.ctrlKey && event.shiftKey) {
    return flow([
      t => insertRow(t, 'above'),
      t => moveTo(t, x, y),
    ], transform)
  }

  if (y === 0) { // First Row - move out of table
    let sibling = state.document.getPreviousSibling(table.key)
    let t = transform

    if (!sibling && event.ctrlKey && event.shiftKey) {
      const parent = state.document.getParent(table.key)
      const tableIndex = parent.nodes.findIndex(n => n === table)

      sibling = Paragraph.create()
      t = t.insertNodeByKey(parent.key, tableIndex, sibling)
    }

    if (sibling) t = t.collapseToStartOf(sibling)

    return t.moveOffsetsTo(0)
  }

  return moveTo(transform, x, y - 1)
}

export default {
  onKeyDown: (event, data, state) => {
    if (!isWithinTable(state)) return undefined

    const transform = state.transform()
    switch (data.key) {
      case 'backspace':
      case 'delete':
        return onDelete(transform, event, data, state)
      case 'down':
        return onDown(transform, event, data, state).apply()
      case 'enter':
        return onEnter(transform, event, data, state).apply()
      case 'left':
        return onLeft(transform, event, data, state).apply()
      case 'right':
        return onRight(transform, event, data, state).apply()
      case 'tab':
        return onTab(transform, event, data, state).apply()
      case 'up':
        return onUp(transform, event, data, state).apply()
      default:
        return undefined
    }
  },
}