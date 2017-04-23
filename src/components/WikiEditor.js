import React, { Component, PropTypes } from 'react'
import { Editor, Html } from 'slate'
import plugins, { schema, serializers, toolbarButtons } from '../plugins'

const HtmlSerializer = new Html({ rules: serializers })

export default class WikiEditor extends Component {
  constructor(props) {
    super(props)
    this.state = {
      state: HtmlSerializer.deserialize(props.html),
      schema,
    }
  }

  componentWillReceiveProps(props) {
    this.setState({
      state: HtmlSerializer.deserialize(props.html),
    })
  }

  onChange = (state) => {
    this.setState({ state })
  }

  handleToolbar = (event, button) => {
    event.preventDefault()
    const state = button.onClick(this.state.state)
    if (state) this.setState({ state }, this.editor.focus)
  }

  renderToolbar = () => (
    <div className="menu toolbar-menu">
      {toolbarButtons.map((button) => {
        let isVisible = true
        if (typeof button.isVisible === 'function') {
          isVisible = button.isVisible(this.state.state)
        } else {
          isVisible = !!button.isVisible
        }

        if (!isVisible) return null

        const isActive = typeof button.isActive === 'function'
          ? button.isActive(this.state.state)
          : !!button.isActive

        const className = [
          `toolbar-button icon icon-${button.icon}`,
          isActive ? 'is-active' : 'is-inactive',
        ].filter(c => c).join(' ')

        return (
          <button
            className={className} data-active={isActive}
            onMouseDown={event => this.handleToolbar(event, button)}
          >{button.text}</button>
        )
      })}
    </div>
  )

  renderEditor = () => (
    <Editor
      placeholder="" spellCheck
      plugins={plugins} schema={schema}
      state={this.state.state}
      onChange={this.onChange}
      ref={(self) => { this.editor = self }}
    />
  )

  render = () => (
    <div className="wiki-editor">
      {this.renderToolbar()}
      {this.renderEditor()}
    </div>
  )
}

WikiEditor.propTypes = {
  html:        PropTypes.string,
  placeholder: PropTypes.string,
}
WikiEditor.defaultProps = {
  html:        '<b>Some test-data to play with!</b>',
  placeholder: 'Enter some text...',
}
