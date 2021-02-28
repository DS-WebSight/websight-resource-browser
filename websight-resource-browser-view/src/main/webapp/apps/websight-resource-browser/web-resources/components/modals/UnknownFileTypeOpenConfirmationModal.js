import React from 'react';
import { Checkbox } from '@atlaskit/checkbox';

import ConfirmationModal from 'websight-admin/ConfirmationModal';

import { getExtension, persistIgnoredExtension } from '../../utils/ContentResourceUtil.js';

export default class UnknownFileTypeOpenConfirmationModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            resourceName: '',
            messageDisabled: false
        }
    }

    open(resource, callback) {
        this.setState({
            resourceName: resource.name,
            messageDisabled: false,
            callback: callback
        });
        this.confirmationModal.open();
    }

    close() {
        this.confirmationModal.close();
    }

    render() {
        const extension = getExtension(this.state.resourceName);
        return (
            <ConfirmationModal
                appearance='warning'
                buttonText='Open'
                heading='Open resource'
                message={(
                    <>
                        <div>Are you sure you want to open <b>{this.state.resourceName}</b> in editor?<br/><br/></div>
                        {extension &&
                        <Checkbox
                            label={`Don't show me this message again for .${extension} extension`}
                            isChecked={this.state.messageDisabled}
                            onChange={(event) => this.setState({ messageDisabled: event.target.checked })}
                        />}
                    </>
                )}
                onConfirm={() => {
                    if (extension && this.state.messageDisabled) {
                        persistIgnoredExtension(extension);
                    }
                    this.confirmationModal.close();
                    this.state.callback && this.state.callback();
                }}
                ref={(element) => this.confirmationModal = element}
            />
        );
    }
}
