import React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import { DateTimePicker } from '@atlaskit/datetime-picker';
import ModalDialog, { ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Select from '@atlaskit/select';
import TextField from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';

import FilePicker from 'websight-admin/FilePicker';
import Form, { FormFooter } from 'websight-rest-atlaskit-client/Form';

import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import ResourceService from '../../services/ResourceService.js';
import { getResourcePath } from '../../utils/ChangelogUtil.js';
import { PROPERTY_TYPE } from '../../utils/ResourceBrowserConstants.js';
import { extractParentWithChild } from '../../utils/ResourceBrowserUtil.js';

const getMandatoryPropertyField = (property) => {
    const { name, type } = property;
    const defaultProps = { key: name, label: name, name: name, isRequired: true };

    if (type === PROPERTY_TYPE.BINARY) {
        return <FilePicker {...defaultProps} placeholder='Browse File' />
    } else if (type === PROPERTY_TYPE.DATE) {
        return <DateTimePicker {...defaultProps} />
    } else if (type === PROPERTY_TYPE.BOOLEAN) {
        return (
            <Select
                {...defaultProps}
                defaultValue={{ label: 'true', value: true }}
                options={[
                    { label: 'true', value: true },
                    { label: 'false', value: false }
                ]}
            />
        )
    } else {
        return <TextField {...defaultProps} />
    }
}

export default class CreateResourceModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newNodeName: '',
            availableTypes: {},
            defaultTypes: {},
            selectedType: '',
            selectedProvider: '',
            isOpen: false,
            resource: {}
        }
        this.close = this.close.bind(this);
        this.open = this.open.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.validateName = this.validateName.bind(this);
        this.nodeTypeSelected = this.nodeTypeSelected.bind(this);
    }

    close() {
        this.setState({ isOpen: false });
    }

    open(resource) {
        const defaultProvider = (((resource || {}).providers || {})[0] || {}).value;
        ResourceService.getResourceCreationInfo({ parentPath: resource.path, parentType: resource.type }, (info) => {
            const availableTypes = {};
            const defaultTypes = {};
            Object.keys(info.detailedInfo)
                .forEach(providerName => {
                    availableTypes[providerName] = info.detailedInfo[providerName].allowedChildrenTypes;
                    defaultTypes[providerName] = info.detailedInfo[providerName].defaultChildrenType;
                });

            this.setState({
                availableTypes: availableTypes,
                defaultTypes: defaultTypes,
                selectedProvider: defaultProvider,
                selectedType: defaultTypes[defaultProvider] || '',
                isOpen: true,
                resource: resource
            });
            this.nodeTypeSelected(this.state.selectedType, defaultProvider, availableTypes)
        });
    }

    mapMandatoryProperties(properties, formData) {
        const mappedProperties = [];
        const pushMandatoryProperty = (name, type, value) => {
            mappedProperties.push({ name: name, type: type, value: value });
        };

        properties.forEach(mandatoryProperty => {
            if (mandatoryProperty.type === PROPERTY_TYPE.BINARY) {
                ChangelogWriteService.convertBinaryValue(formData[mandatoryProperty.name]).then(result => {
                    pushMandatoryProperty(mandatoryProperty.name, mandatoryProperty.type, result.substr(result.indexOf(',') + 1));
                });
            } else {
                pushMandatoryProperty(mandatoryProperty.name, mandatoryProperty.type,
                    mandatoryProperty.type === PROPERTY_TYPE.BOOLEAN ?
                        formData[mandatoryProperty.name].value : formData[mandatoryProperty.name]);
            }
        })

        return mappedProperties;
    }

    onSubmit(formData) {
        const { name, type, provider } = formData;
        const { availableTypes, resource, selectedProvider } = this.state;
        const { changelog, onChangelogUpdate } = this.props;
        const selectedType = this.state.selectedType || {};

        const mandatoryProperties = this.mapMandatoryProperties(selectedType.mandatoryProperties || [], formData);
        ChangelogWriteService.createResource(changelog, resource.path, provider.value, name, (type || {}).value,
            mandatoryProperties);

        Object.keys(selectedType.mandatoryChildren || {})
            .forEach(childName => {
                const mandatoryChild = selectedType.mandatoryChildren[childName];
                if (availableTypes[selectedProvider].some(availableType => availableType.name === mandatoryChild.name)) {
                    ChangelogWriteService.createResource(changelog, getResourcePath(resource.path, name), provider.value, childName, mandatoryChild.name,
                        this.mapMandatoryProperties(mandatoryChild.mandatoryProperties, formData))
                }
            });

        onChangelogUpdate(changelog);
        this.close();
    }

    validateName(name) {
        const isAlreadyPresent = this.state.resource.children
            .map(childPath => extractParentWithChild(childPath).childName)
            .some(childName => name === childName);
        if (isAlreadyPresent) {
            return 'Resource with this name already exists';
        }
    }

    nodeTypeSelected(typeName, selectedProvider, availableTypes) {
        const selectedType = availableTypes[selectedProvider]
            .find(available => available.name === typeName)
        this.setState({ selectedType: selectedType })
        if (selectedType && selectedType.allowedChildName !== '*') {
            this.setState({ newNodeName: selectedType.allowedChildName })
            this.nameTextField.disabled = true;
        } else {
            this.setState({ newNodeName: '' })
            this.nameTextField.disabled = false;
        }
    }

    render() {
        const { availableTypes, defaultTypes, isOpen, resource, selectedProvider, selectedType } = this.state;

        const providerOptions = (resource.providers || [])
            .filter(provider => provider.modifiable)
            .map(provider => ({ value: provider.value, label: provider.label + ' Provider' }));

        const definesTypes = Object.keys(availableTypes).includes(selectedProvider);

        const typeSection = () => {
            const typeOptions = definesTypes ? availableTypes[selectedProvider].map(type => ({ label: type.name, value: type.name })) : [];
            const typeMandatoryProperties = (selectedType || {}).mandatoryProperties || [];

            return (
                <>
                    <Select
                        label='Type'
                        name='type'
                        isClearable={false}
                        isRequired={true}
                        options={typeOptions}
                        defaultValue={typeOptions.find(({ label }) => label === defaultTypes[selectedProvider])}
                        menuPosition='fixed'
                        noOptionsMessage={() => ('No type is allowed under selected parent path.')}
                        onChange={(type) => this.nodeTypeSelected(type.value, selectedProvider, availableTypes)}
                    />
                    {typeMandatoryProperties.length > 0 && (
                        <>
                            {typeMandatoryProperties.map(property => getMandatoryPropertyField(property))}
                        </>
                    )}
                </>
            )
        }

        return (
            <ModalTransition>
                {isOpen && (
                    <ModalDialog
                        scrollBehavior='inside'
                        components={{
                            Header: (props) => (
                                <ModalHeader
                                    {...props}
                                    style={{
                                        alignItems: 'baseline',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <ModalTitle>Create Resource</ModalTitle>
                                    <p>Parent resource: {resource.path}</p>
                                </ModalHeader>
                            )
                        }}
                        onClose={this.close}
                    >
                        {definesTypes && !availableTypes[selectedProvider].length && (
                            <SectionMessage appearance='error'>
                                Cannot create Resource below <em>{resource.path}</em>. No type is allowed for <em>{selectedProvider}</em> provider.
                            </SectionMessage>
                        )}
                        {definesTypes && Object.keys((selectedType || {}).mandatoryChildren || [])
                            .filter(childName => !availableTypes[selectedProvider]
                                .some(availableType => availableType.name === selectedType.mandatoryChildren[childName].name))
                            .map(childName => (
                                <SectionMessage
                                    key={childName}
                                    title='Selected NodeType has mandatory child Node without predefined NodeType'
                                    appearance='warning'>
                                    <p>
                                        Please make sure to create child Node <code>{childName}</code> with the type selected from allowed
                                        type list: <i>{selectedType.mandatoryChildren[childName].name}</i>.
                                    </p>
                                </SectionMessage>
                            ))
                        }
                        <Form onSubmit={this.onSubmit}>
                            {({ submitted }) => (
                                <>
                                    <TextField
                                        autocomplete='off'
                                        label='Name'
                                        name='name'
                                        value={this.state.newNodeName}
                                        ref={element => this.nameTextField = element}
                                        isRequired={true}
                                        validate={this.validateName}
                                    />
                                    <Select
                                        label='Resource provider'
                                        name='provider'
                                        isRequired={true}
                                        value={providerOptions.find(option => option.value === selectedProvider)}
                                        defaultValue={providerOptions[0]}
                                        options={providerOptions}
                                        menuPosition='fixed'
                                        noOptionEmptyMessage={() => ('None of selected providers is capable of creating node under selected parent path.')}
                                        onChange={(provider) => this.setState({ selectedProvider: provider.value })}
                                    />
                                    {definesTypes && typeSection()}
                                    <FormFooter>
                                        <ButtonGroup>
                                            <Button
                                                appearance='primary'
                                                type='submit'
                                                isDisabled={!selectedProvider || (!selectedType && definesTypes)}
                                                isLoading={submitted}
                                            >
                                                Create
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
