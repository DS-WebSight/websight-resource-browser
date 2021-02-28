import React from 'react';
import Button from '@atlaskit/button';
import { Cell, Row, Rows } from '@atlaskit/table-tree';
import InlineEdit from '@atlaskit/inline-edit';
import Select from '@atlaskit/select';
import TextField from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

import InlineEditContainer from './PropertyInlineEditContainer.js';
import PropertyMultiField from './PropertyMultiField.js';
import PropertyValueField from './PropertyValueField.js';
import { ARRAY_SUFFIX, PROPERTY_TYPE } from '../../utils/ResourceBrowserConstants.js';

const Actionbar = styled.div`
    padding: 6px 12px;
`;

const CreatedPropertyWrapper = styled.div`
    border-left: 2px solid ${colors.green};
    padding-right: 20px;
    font-weight: bold;
    input {
        font-weight: bold;
    }
    &:nth-of-type(even),
    &:nth-of-type(even) input + div > i,
    &:nth-of-type(even) input {
        background: ${colors.veryLightGrey}
    }
`;

const Icon = styled.i`
    color: ${colors.grey};
    cursor: pointer;
    display: flex;
    font-size: 12px;
    margin: 0 2px;
`;

const DuplicatedIcon = styled.i`
    cursor: pointer;
    color: ${colors.red};
    padding-left: 5px;
    font-size: 12px;
    line-height: 30px;
`;

const cellStyle = {
    alignItems: 'flex-start'
}

const deleteCellStyle = {
    paddingTop: '5px',
    alignItems: 'flex-start'
}

const operationButtonStyle = {
    height: '24px',
    position: 'absolute',
    right: '10px',
    top: '3px',
    width: '26px'
}

export default class PropertyCreationSection extends React.Component {
    constructor(props) {
        super(props);
        this.createPropertyRow = this.createPropertyRow.bind(this);
    }

    createPropertyRow(property) {
        const { name, type } = property;
        const { resource, changelog, onChangelogUpdate, onCreatedPropertyChange, onCreatedPropertyRemove,
            isDuplicated, provider } = this.props;

        const isMultivalued = type.endsWith(ARRAY_SUFFIX);

        const onFieldChange = (param) => {
            onCreatedPropertyChange(param)
        }

        const createTypeOptions = () => {
            return Object.values(PROPERTY_TYPE).reduce((result, propertyType) => {
                result.push({ label: propertyType, value: propertyType });
                result.push({ label: propertyType + ARRAY_SUFFIX, value: propertyType + ARRAY_SUFFIX });
                return result;
            }, []);
        }

        const onRevertValue = (id) => {
            onCreatedPropertyChange({ ...property, value: (property.value || []).filter((pValue, index) => index !== id) });
        }

        return (
            <CreatedPropertyWrapper>
                <Row key={name} itemId={name}>
                    <Cell singleLine style={cellStyle}>
                        <InlineEditContainer className='new-property-name'>
                            <TextField
                                defaultValue={name}
                                placeholder='Name'
                                className='inline-editfield'
                                elemAfterInput={isDuplicated(property) && (
                                    <Tooltip content='Property will not be saved because of duplicated name' delay={0}>
                                        <DuplicatedIcon className='material-icons'>warning</DuplicatedIcon>
                                    </Tooltip>
                                )}
                                appearance='subtle'
                                isCompact={true}
                                autoFocus={true}
                                onChange={(event) => onFieldChange({ ...property, name: event.target.value })}
                            />
                        </InlineEditContainer>
                    </Cell>
                    <Cell style={cellStyle}>
                        <InlineEditContainer className='new-property-type'>
                            <InlineEdit
                                readViewFitContainerWidth={true}
                                hideActionButtons={true}
                                editView={() => {
                                    return (
                                        <Select
                                            className='inline-editfield'
                                            defaultValue={{ label: PROPERTY_TYPE.STRING, value: PROPERTY_TYPE.STRING }}
                                            value={type ? { label: type, value: type } : undefined}
                                            spacing='compact'
                                            options={createTypeOptions()}
                                            closeMenuOnSelect={true}
                                            blurInputOnSelect={true}
                                            defaultMenuIsOpen={true}
                                            autoFocus={true}
                                            menuPosition='fixed'
                                            menuPlacement='top'
                                            onChange={(option) => {
                                                onFieldChange({ ...property, type: option.value, value: undefined })
                                            }}
                                        />
                                    )
                                }}
                                readView={() => <span>{type}</span>}
                                onConfirm={() => {
                                    // handled on edit view level
                                }}
                            />
                        </InlineEditContainer>
                    </Cell>
                    <Cell style={cellStyle}>
                        {isMultivalued ? (
                            <PropertyMultiField
                                changelog={changelog}
                                onChange={(pName, pType, pValue) => onFieldChange({ ...property, value: pValue })}
                                onChangelogUpdate={onChangelogUpdate}
                                onUndo={onRevertValue}
                                onRemove={onRevertValue}
                                property={property}
                                provider={provider}
                                resource={resource}
                                isNewProperty={true}
                            />
                        ) : (
                            <PropertyValueField
                                changelog={changelog}
                                hideActions={true}
                                onChange={(pName, pType, pValue) => onFieldChange({ ...property, value: pValue })}
                                onChangelogUpdate={onChangelogUpdate}
                                property={property}
                                provider={provider}
                                resource={resource}
                            />
                        )}
                    </Cell>
                    <Cell>
                    </Cell>
                    <Cell style={deleteCellStyle}>
                        <Tooltip content='Remove' position='top' delay={0}>
                            <Button
                                label='Delete Resource'
                                spacing='compact'
                                onClick={() => onCreatedPropertyRemove(property)}
                                style={operationButtonStyle}
                                iconBefore={<Icon className='material-icons'>undo</Icon>}
                            />
                        </Tooltip>
                    </Cell>
                </Row>
            </CreatedPropertyWrapper>
        )
    }

    render() {
        const { onCreateProperty, createdProperties } = this.props;
        return (
            <>
                <Rows
                    items={createdProperties}
                    render={(property) => this.createPropertyRow(property)}
                />
                <Actionbar>
                    <Button onClick={() => onCreateProperty()}>Add Property</Button>
                </Actionbar>
            </>
        )
    }
}