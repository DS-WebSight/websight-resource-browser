import React from 'react';
import Button from '@atlaskit/button';
import { Cell, Row } from '@atlaskit/table-tree';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

import ChangelogReadService from '../../services/ChangelogReadService.js';
import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import PropertyMultiField from './PropertyMultiField.js';
import PropertyValueField from './PropertyValueField.js';

const PropertyDetailsContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    & > span {
        cursor: default;
        width: 17px;
        height: 20px;
        text-align: center;
    }
`;

const PropertyRowWrapper = styled.div`
    border-left: 2px solid transparent;
    &:nth-of-type(even),
    &:nth-of-type(even) input {
        background: ${colors.veryLightGrey}
    }
    & > div {
        padding-right: 20px;
    }
    &.modified,
    &.removed {
        font-weight: bold;
        input {
            font-weight: bold;
        }
    }
    &.modified {
        border-left: 2px solid ${colors.yellow};
    }
    &.removed {
        border-left: 2px solid ${colors.red};

        .name span,
        .type span,
        .values span {
            opacity: .75;
        }

        .name,
        .type {
            text-decoration: line-through;
        }
    }
    .remove-button {
        display: none;
    }
    &:hover .remove-button{
        display: flex;
    }
`;

const LockIcon = styled.i`
    color: ${colors.grey};
    font-size: 12px;
    margin-top: 2px;
    vertical-align: middle;
`;

const CharIcon = styled.span`
    color: ${colors.grey};
    font-size: 16px;
    vertical-align: baseline;
`;

const OperationIcon = styled.i`
    color: ${colors.grey};
    font-size: 14px;
`;

const operationButtonStyle = {
    height: '24px',
    position: 'absolute',
    right: '10px',
    top: '3px',
    width: '26px'
}

const cellStyle = {
    paddingTop: '0',
    paddingBottom: '0',
    alignItems: 'flex-start',
    lineHeight: '30px',
    minHeight: '30px'
}

export default class PropertyRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            removed: false,
            modified: false
        }
        this.onChange = this.onChange.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRemove = this.onRemove.bind(this);
    }

    componentDidMount() {
        const { changelog, resource, provider, property } = this.props;
        this.setState(ChangelogReadService.getPropertyState(changelog[resource.path], provider, property));
    }

    componentDidUpdate(prevProps) {
        const { changelog, resource, provider, property } = this.props;
        if (prevProps !== this.props) {
            this.setState(ChangelogReadService.getPropertyState(changelog[resource.path], provider, property));
        }
    }

    onChange(name, type, value) {
        const { onChangelogUpdate, changelog, resource, provider } = this.props;
        ChangelogWriteService.setProperty(changelog, resource.path, provider, name, type, value);
        onChangelogUpdate(changelog);
        this.setState({ modified: true, removed: false });
    }

    onUndo(name) {
        const { changelog, onChangelogUpdate, resource, provider } = this.props;
        ChangelogWriteService.undoRemoveProperty(changelog, resource.path, provider, name);
        ChangelogWriteService.undoSetProperty(changelog, resource.path, provider, name);
        onChangelogUpdate(changelog);
        this.setState({ modified: false, removed: false });
    }

    onRemove(name) {
        const { onChangelogUpdate, changelog, resource, provider } = this.props;
        ChangelogWriteService.removeProperty(changelog, resource.path, provider, name);
        onChangelogUpdate(changelog);
        this.setState({ modified: false, removed: true });
    }

    render() {
        const { resource, changelog, onChangelogUpdate, property, provider } = this.props;
        const { modified, removed } = this.state;
        const { name, type, modifiable, autoCreated, mandatory } = property;
        const isMultivalued = Array.isArray(property.value);
        const hasChange = modified || removed;

        const withTooltip = (element, text) => {
            return <Tooltip content={text} delay={0} position='top' hideTooltipOnClick>{element}</Tooltip>
        }

        const createActionIcon = (text, icon, onClick) => {
            return (
                <Tooltip content={text} delay={0}>
                    <Button
                        label='Delete Resource'
                        spacing='compact'
                        onClick={onClick}
                        style={operationButtonStyle}
                        iconBefore={<OperationIcon className='material-icons'>{icon}</OperationIcon>}
                    />
                </Tooltip>
            )
        }

        const actions = () => {
            if (modifiable) {
                return hasChange ? (
                    <>
                        {createActionIcon('Undo', 'undo', () => this.onUndo(name))}
                    </>
                ) : (
                    <>
                        {!mandatory && <div className='remove-button'>
                            {createActionIcon('Remove property', 'delete', () => this.onRemove(name))}
                        </div>}
                    </>
                )
            }
        }

        return (
            <PropertyRowWrapper className={(modified && 'modified') + ' ' + (removed && 'removed')}>
                <Row key={name} itemId={name}>
                    <Cell singleLine className='name' style={cellStyle}>{name}</Cell>
                    <Cell singleLine className='type' style={cellStyle}>{type}</Cell>
                    <Cell className='values' style={cellStyle}>
                        {isMultivalued ? (
                            <PropertyMultiField
                                changelog={changelog}
                                onChange={this.onChange}
                                onChangelogUpdate={onChangelogUpdate}
                                onUndo={this.onUndo}
                                onRemove={this.onRemove}
                                property={property}
                                provider={provider}
                                resource={resource}
                                removed={removed}
                                modified={modified}
                            />
                        ) : (
                            <PropertyValueField
                                changelog={changelog}
                                onChange={this.onChange}
                                onChangelogUpdate={onChangelogUpdate}
                                onUndo={this.onUndo}
                                onRemove={this.onRemove}
                                property={property}
                                provider={provider}
                                resource={resource}
                                removed={removed}
                                modified={modified}
                            />
                        )}
                    </Cell>
                    <Cell style={cellStyle}>
                        <PropertyDetailsContainer>
                            <span>{!modifiable && withTooltip(<LockIcon className='material-icons'>lock</LockIcon>, 'Protected')}</span>
                            <span>{autoCreated && withTooltip(<CharIcon>ᴀ</CharIcon>, 'Autocreated')}</span>
                            <span style={{ marginTop: '1px' }}>{mandatory && withTooltip(<CharIcon>﹡</CharIcon>, 'Mandatory')}</span>
                        </PropertyDetailsContainer>
                    </Cell>
                    <Cell style={cellStyle}>
                        {!this.props.hideActions && actions()}
                    </Cell>
                </Row>
            </PropertyRowWrapper>
        )
    }
}