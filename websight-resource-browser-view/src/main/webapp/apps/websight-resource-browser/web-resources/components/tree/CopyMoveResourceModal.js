import React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import ModalDialog, { ModalTransition } from '@atlaskit/modal-dialog';
import TextField from '@atlaskit/textfield';

import PathAutosuggestion from 'websight-autosuggestion-esm/PathAutosuggestion';
import Form, { FormFooter } from 'websight-rest-atlaskit-client/Form';

import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import { extractParentWithChild } from '../../utils/ResourceBrowserUtil.js';
import ResourceService from '../../services/ResourceService.js';

export default class CopyMoveResourceModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: false,
            isMove: false,
            resource: {}
        }
        this.close = this.close.bind(this);
        this.open = this.open.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.onCopy = this.onCopy.bind(this);
        this.onMove = this.onMove.bind(this);
    }

    close() {
        this.setState({ isOpen: false });
    }

    open(resource, isMove) {
        this.setState({ isOpen: true, isMove: isMove, resource: resource, name: resource.name });
    }

    onSubmit(formData, onSuccess, onFailure) {
        const { destination, name } = formData;
        const { existingPaths } = this.props;
        const { resource } = this.state;

        const newPath = `${destination}/${name}`.replace(/\/\/+/g, '/')

        const resourceAlreadyExist = () =>
            onFailure({
                entity: [
                    { path: 'name', message: `Resource '${newPath}' already exists` }
                ]
            });

        if (existingPaths.includes(newPath)) {
            resourceAlreadyExist()
        } else {
            ResourceService.listResources(
                { paths: [newPath], providers: resource.providers },
                (resources) => {
                    if (resources.length) {
                        resourceAlreadyExist();
                    } else {
                        this.state.isMove ? this.onMove(destination, name) : this.onCopy(destination, name);
                    }
                }
            );
        }
    }

    onCopy(destination, name) {
        const { changelog, onChangelogUpdate } = this.props;
        const { resource } = this.state;
        ChangelogWriteService.copyResource(changelog, resource, (destination + '/' + name).replace(/\/\/+/g, '/'));
        onChangelogUpdate(changelog);
    }

    onMove(destination, name) {
        const { changelog, onChangelogUpdate } = this.props;
        const { resource } = this.state;
        ChangelogWriteService.moveResource(changelog, resource, (destination + '/' + name).replace(/\/\/+/g, '/'));
        onChangelogUpdate(changelog);
    }

    render() {
        const { isOpen, isMove, resource } = this.state;

        const { parentPath } = extractParentWithChild(resource.path);

        return (
            <ModalTransition>
                {isOpen && (
                    <ModalDialog
                        heading={isMove ? 'Move Resource' : 'Copy Resource'}
                        onClose={this.close}
                    >
                        <Form onSubmit={this.onSubmit}>
                            {({ submitted }) => (
                                <>
                                    <PathAutosuggestion
                                        label='Destination path'
                                        name='destination'
                                        menuPosition='fixed'
                                        noOptionsMessage={(inputValue) => `No resource found for "${inputValue}"`}
                                        parameters={{ autosuggestionType: 'resource-browser', providers: (resource.providers || {}).map(({ value }) => value) }}
                                        placeholder='Choose a destination path'
                                        isRequired={true}
                                        defaultValue={parentPath}
                                    />
                                    <TextField
                                        autocomplete='off'
                                        label='Name'
                                        name='name'
                                        defaultValue={resource.name}
                                        isRequired={true}
                                    />
                                    <FormFooter>
                                        <ButtonGroup>
                                            <Button
                                                appearance='primary'
                                                type='submit'
                                                isDisabled={submitted}
                                            >
                                                {isMove ? 'Move' : 'Copy'}
                                            </Button>
                                            <Button
                                                appearance='subtle'
                                                onClick={this.close}
                                                isDisabled={submitted}
                                            >
                                                Cancel
                                            </Button>
                                        </ButtonGroup>
                                    </FormFooter>
                                </>
                            )}
                        </Form>
                    </ModalDialog>
                )}
            </ModalTransition>
        )
    }
}
