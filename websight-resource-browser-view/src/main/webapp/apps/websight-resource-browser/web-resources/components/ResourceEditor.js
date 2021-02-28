import React from 'react';
import styled from 'styled-components';

import CodeMirror, { importAndSetCodeMirrorMode } from 'websight-admin/CodeMirror';

const TabContentContainer = styled.div`
    width: 100%;
    height: 100%;

    .react-codemirror2 {
        width: 100%;
        height: 100%;
    }

    .CodeMirror {
        resize: none;
        overflow-y: hidden;
        border: 1px solid #DFE1E6;
        font-size: 12px;
        font-family: 'SFMono-Medium', 'SF Mono', 'Segoe UI Mono', 'Roboto Mono', 'Ubuntu Mono', 'Menlo', 'Consolas', 'Courier', 'monospace';
        z-index: 0;
        width: 100%;
        height: 100%;
    }
`;

export default class ResourceEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onEditorContentChange = this.onEditorContentChange.bind(this);
    }

    componentDidMount() {
        const { editor } = this.props;
        importAndSetCodeMirrorMode(editor.mimeType, this.codeEditor, editor.name);
    }

    onEditorContentChange(editorRef, data, value) {
        const { editor, onEditorContentChange } = this.props;

        onEditorContentChange({ ...editor, content: value, changed: true });
    }

    render() {
        const { editor } = this.props;

        return (
            <TabContentContainer>
                <CodeMirror
                    value={editor.content}
                    options={{
                        lineNumbers: true,
                        matchBrackets: true,
                        autoCloseBrackets: true,
                        addModeClass: true,
                        readOnly: editor.readOnly ? 'nocursor' : false,
                        mode: editor.mimeType
                    }}
                    onBeforeChange={this.onEditorContentChange}
                    editorDidMount={editorInstance => this.codeEditor = editorInstance }
                />
            </TabContentContainer>
        )
    }
}