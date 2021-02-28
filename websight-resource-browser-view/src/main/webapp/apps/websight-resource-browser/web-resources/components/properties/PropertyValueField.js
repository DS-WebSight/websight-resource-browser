import React from 'react';
import Button from '@atlaskit/button';
import { DateTimePicker } from '@atlaskit/datetime-picker';
import InlineEdit from '@atlaskit/inline-edit';
import Select from '@atlaskit/select';
import TextArea from '@atlaskit/textarea';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import FilePicker from 'websight-admin/FilePicker';
import { colors } from 'websight-admin/theme';

import InlineEditContainer from './PropertyInlineEditContainer.js';
import ChangelogReadService from '../../services/ChangelogReadService.js';
import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import { getResourcePath } from '../../utils/ChangelogUtil.js';
import { ARRAY_SUFFIX, PROPERTY_TYPE } from '../../utils/ResourceBrowserConstants.js';


const ReadViewContainer = styled.div`
    align-items: center;
    display: flex;
    min-height: 26px;
    white-space: break-spaces;
    width: 100%;
    word-break: break-word;
    &:not(.expanded) span {
        overflow-wrap: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    &.removed {
        line-height: unset;
        text-decoration: line-through;
        width: calc(100% - 48px);
        padding-left: 1px;
    }
`;

const ActionIcon = styled.i`
    color: ${colors.grey};
    font-size: 14px;
`;

const DEFAULT_DATE_TIME = '00:00:00';
const PROPERTY_VALUE_MAX_LENGTH = 200;

export default class PropertyValueField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.property.value,
            valueModified: props.modified,
            valueRemoved: props.removed,
            overflowing: false,
            expanded: false
        }
        this.valueContainer = React.createRef();
        this.onChange = this.onChange.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRemove = this.onRemove.bind(this);
        this.checkIfOverflowing = this.checkIfOverflowing.bind(this);
    }

    componentDidMount() {
        const { changelog, property, provider, resource } = this.props;
        this.setState(ChangelogReadService.getPropertyState(changelog[resource.path], provider, property), this.checkIfOverflowing);
    }

    componentDidUpdate(prevProps, prevState) {
        const propertySaved = ChangelogReadService.isSaved(prevProps.changelog, this.props.changelog);
        const propertyValueUpdatedByParent = prevProps.property.value !== this.props.property.value;

        if (propertySaved) {
            this.setState({ value: this.props.property.value, valueModified: false, valueRemoved: false });
        } else if (propertyValueUpdatedByParent) {
            this.setState({ value: this.props.property.value });
        }

        if (prevState.value !== this.state.value) {
            this.checkIfOverflowing();
        }

        const propertyChangesReverted = (prevProps.removed !== this.props.removed || prevProps.modified !== this.props.modified) && !this.props.removed && !this.props.modified;
        const propertyRemoved = (prevProps.removed !== this.props.removed) && this.props.removed;

        if (propertyChangesReverted) {
            this.setState({ valueRemoved: false, valueModified: false, value: this.props.property.value });
        } else if (propertyRemoved) {
            this.setState({ valueRemoved: true });
        } else if (prevProps.property.type !== this.props.property.type) {
            this.onChange(this.useDefaultValue(this.props.property));
        }
    }

    useDefaultValue(property) {
        const { value, type } = property;
        if (value && value.length) {
            return value;
        }

        switch (type) {
        case PROPERTY_TYPE.BOOLEAN:
            return 'false';
        case PROPERTY_TYPE.DATE:
            return new Date().toISOString().substring(0, 19);
        case PROPERTY_TYPE.DECIMAL:
        case PROPERTY_TYPE.DOUBLE:
        case PROPERTY_TYPE.LONG:
            return '0';
        default:
            return '';
        }
    }

    checkIfOverflowing() {
        if (this.valueContainer.current) {
            const { clientWidth, scrollWidth } = this.valueContainer.current;
            this.setState({ overflowing: clientWidth < scrollWidth });
        }
    }

    binaryLink() {
        const { property, resource } = this.props;
        if (resource) {
            if (property.value) {
                const resourceUrl = window.location.origin + (property.name === 'jcr:data' ?
                    resource.path.replace('/jcr:content', '') : getResourcePath(resource.path, property.name));

                return <a href={resourceUrl} target='_blank' rel='noreferrer'>Download</a>
            }
            return <span>No data</span>
        }
    }

    showValue(value) {
        if (typeof value === 'string') {
            return this.state.expanded ? value : value.substring(0, PROPERTY_VALUE_MAX_LENGTH);
        }
        return JSON.stringify(value);
    }

    onChange(value) {
        if (value !== this.state.value) {
            const { property } = this.props;
            this.setState({ value: value, valueModified: true }, () => this.props.onChange(property.name, property.type, value));
        }
    }

    onUndo() {
        this.setState({ value: this.props.property.value, valueModified: false, valueRemoved: false },
            this.props.onUndo(this.props.property.name));
    }

    onRemove() {
        this.setState({ valueRemoved: true }, this.props.onRemove(this.props.property.name));
    }

    render() {
        const { type, mandatory, modifiable } = this.props.property;
        const { value, valueModified, valueRemoved, overflowing, expanded } = this.state;
        const valueHasChange = valueModified || valueRemoved;

        const fieldType = type.split(ARRAY_SUFFIX)[0];
        const getPropertyValueEditField = (fieldProps) => {
            const defaultProps = {
                className: 'inline-editfield',
                autoFocus: true,
                ...fieldProps
            }
            if (fieldType === PROPERTY_TYPE.BOOLEAN)  {
                return (
                    <Select
                        {...defaultProps}
                        spacing='compact'
                        defaultMenuIsOpen={true}
                        options={['true', 'false']}
                        getOptionLabel={(option) => option }
                        getOptionValue={(option) => option }
                        closeMenuOnSelect={true}
                        blurInputOnSelect={true}
                        menuPosition='fixed'
                        menuPlacement='top'
                    />
                );
            } else if (fieldType === PROPERTY_TYPE.DATE) {
                return (
                    <DateTimePicker
                        {...defaultProps}
                        appearance='subtle'
                        defaultIsOpen={true}
                        spacing='compact'
                        isOpen={true}
                        datePickerProps={{
                            onChange: (dateValue) => {
                                if (dateValue) {
                                    const dateTimeValue = value ? value.replace(/.*T/, `${dateValue}T`) : `${dateValue}T${DEFAULT_DATE_TIME}`;
                                    this.onChange(dateTimeValue);
                                } else {
                                    this.useDefaultValue(this.props.property);
                                }
                            }
                        }}
                        timePickerProps={{
                            onChange: (timeValue) => {
                                if (value) {
                                    const dateTimeValue = value.replace(/T.*/, timeValue ? `T${timeValue}:00` : `T${DEFAULT_DATE_TIME}`);
                                    this.onChange(dateTimeValue);
                                }
                            }
                        }}
                    />
                );
            } else if (fieldType === PROPERTY_TYPE.BINARY) {
                return (
                    <FilePicker
                        {...defaultProps}
                        spacing="compact"
                        placeholder='Browse File'
                        onChange={(event) => {
                            const file = event.target.files[0];
                            if (file) {
                                ChangelogWriteService.convertBinaryValue(file).then(result => {
                                    this.onChange(result.substr(result.indexOf(',') + 1));
                                });
                            }
                        }}
                    />
                )
            } else if (expanded) {
                return (
                    <TextArea
                        {...defaultProps}
                        appearance='subtle'
                        maxHeight='300px'
                        isCompact={true}
                    />
                )
            } else {
                return (
                    <Textfield
                        {...defaultProps}
                        type={[PROPERTY_TYPE.LONG, PROPERTY_TYPE.DECIMAL, PROPERTY_TYPE.DOUBLE].includes(fieldType) ? 'number' : 'text'}
                        appearance='subtle'
                        isCompact={true}
                    />
                )
            }
        }

        const createActionIcon = (text, icon, onClick) => {
            return (
                <Tooltip content={text} delay={0}>
                    <Button
                        label='Delete Value'
                        spacing='compact'
                        onClick={onClick}
                        style={{ position: 'absolute', right: '0', marginTop: '5px' }}
                        iconBefore={<ActionIcon className='material-icons'>{icon}</ActionIcon>}
                    />
                </Tooltip>
            )
        }

        const getReadView = (className) => {
            return (
                <>
                    {
                        fieldType === PROPERTY_TYPE.BINARY ?
                            <ReadViewContainer>
                                <span>{this.binaryLink()}</span>
                            </ReadViewContainer>
                            :
                            <ReadViewContainer className={`${className} ${modifiable ? 'modifiable' : ''}`}>
                                <span ref={this.valueContainer}>{this.showValue(value)}</span>
                            </ReadViewContainer>
                    }
                </>
            )
        }

        const actions = () => {
            if (modifiable) {
                return valueHasChange ? (
                    <>
                        {valueRemoved && getReadView('removed ' + (expanded ? 'expanded' : ''))}
                        {this.props.isMultiField && createActionIcon('Undo', 'undo', this.onUndo)}
                    </>
                ) : (
                    <>
                        {!mandatory && <div className='remove-button'>
                            {this.props.isMultiField && createActionIcon('Remove value', 'delete', this.onRemove)}
                        </div>}
                    </>
                )
            }
            return getReadView(expanded ? 'expanded' : '');
        }

        return (
            <InlineEditContainer>
                {modifiable && !valueRemoved && (
                    <InlineEdit
                        defaultValue={value}
                        editView={(fieldProps, ref) => getPropertyValueEditField(fieldProps, ref)}
                        hideActionButtons={!this.props.property.type.includes(PROPERTY_TYPE.BINARY)}
                        keepEditViewOpenOnBlur={this.props.property.type.includes(PROPERTY_TYPE.BINARY)}
                        onConfirm={this.onChange}
                        readView={() => getReadView(expanded ? 'expanded' : '') }
                        readViewFitContainerWidth={true}
                    />
                )}
                {!this.props.hideActions && actions()}
                {overflowing && (
                    <Button
                        appearance="subtle-link"
                        style={{ padding: 0 }}
                        onClick={() => {
                            this.setState((prevState) => {
                                return { expanded: !prevState.expanded }
                            })
                        }}>
                        {expanded ? 'Shrink' : 'Expand'}
                    </Button>
                )}
            </InlineEditContainer>
        )
    }
}