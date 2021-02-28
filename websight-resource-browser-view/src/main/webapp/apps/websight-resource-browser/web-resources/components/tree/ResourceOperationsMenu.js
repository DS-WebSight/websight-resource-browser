import React from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Tooltip from '@atlaskit/tooltip';
import styled from 'styled-components';
import { fetchApplicableActions } from 'websight-admin/utils/ExtraActionsUtil';

import ChangelogWriteService from '../../services/ChangelogWriteService.js';

const ResourceOperationsMenuContainer = styled.div`
    background: #f4f5f7;
    position: absolute;
    top: 0;
    z-index: 200;
    right: 20px;
`;

const ResourceOperationsContextMenuContainer = styled.div`
    background: #f4f5f7;
    position: absolute;
    top: 0;
    z-index: 300;
    left: 30px;
`;

const OperationIcon = styled.i`
    font-size: 14px;
    vertical-align: middle;
    position: relative;
    bottom: 2px;
    padding-right: 5px;
`;

export default class ResourceOperationsMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: this.props.selected || false,
            extraActions: this.props.extraActions
        }
        this.close = this.close.bind(this);
        this.open = this.open.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.selected !== this.props.selected) {
            this.setState({ isOpen: this.props.selected })
        }
    }

    close() {
        if (!this.props.selected) {
            this.setState({ isOpen: false })
        }
    }

    open() {
        if (!this.props.selected) {
            this.setState({ isOpen: true })
        }
    }

    filterActions(event) {
        if (event.isOpen) {
            fetchApplicableActions(this.props.extraActions, this.props.resource.path, (actions) => {
                this.setState({ extraActions: actions })
            })
        }
    }

    render() {
        const { changelog, children, onChangelogUpdate, onCreateResource, onRenameResource, resource, onCopyMoveResource,
            onTreeRefresh, onNodeRefresh, loadingResources } = this.props;
        const { extraActions } = this.state;

        const createResourceOption = { label: 'Create Resource', icon: 'add', props: { onClick: () => onCreateResource(resource) } };

        const options = [
            createResourceOption,
            {
                label: 'Delete Resource',
                icon: 'delete',
                props: {
                    onClick: () => {
                        ChangelogWriteService.removeResource(changelog, resource);
                        onChangelogUpdate(changelog);
                    }
                }
            },
            { label: 'Refresh Node', icon: 'refresh', props: { onClick: onNodeRefresh, isLoading: loadingResources } },
            { label: 'Rename Resource', icon: 'edit', props: { onClick: onRenameResource } },
            { label: 'Move Resource', icon: 'swap_vert', props: { onClick: () => onCopyMoveResource(resource, true) } },
            { label: 'Copy Resource', icon: 'content_copy', props: { onClick: () => onCopyMoveResource(resource, false) } }

        ];

        const rootOptions = [
            createResourceOption,
            { label: 'Refresh Tree', icon: 'refresh', props: { onClick: onTreeRefresh, isLoading: loadingResources } }
        ]

        return (
            <div style={{ position: 'relative' }} >
                {children}
                {this.state.isOpen && (<>
                    <ResourceOperationsContextMenuContainer>
                        <DropdownMenu defaultOpen={resource.showContextMenu} onOpenChange={(e) => {
                            if (!e.isOpen) {
                                resource.showContextMenu = false;
                            }
                        }}>
                            <DropdownItemGroup >
                                {(resource.path === '/' ? rootOptions : options).map(({ icon, label, props }) => (
                                    <DropdownItem key={label}
                                        {...props}
                                        spacing='compact'>
                                        <OperationIcon className='material-icons'>{icon}</OperationIcon>
                                        {label}
                                    </DropdownItem>
                                ))}
                                {extraActions && extraActions.map((action, index) => {
                                    return (
                                        <DropdownItem
                                            spacing='compact'
                                            key={index}
                                            onClick={() => action.onClick(resource)}>
                                            <OperationIcon className='material-icons'>{action.icon}</OperationIcon>
                                            {action.label}
                                        </DropdownItem>
                                    )
                                })}
                            </DropdownItemGroup>
                        </DropdownMenu>
                    </ResourceOperationsContextMenuContainer>
                    <ResourceOperationsMenuContainer>
                        <DropdownMenu defaultOpen={false} triggerType={'button'} onOpenChange={(event) => this.filterActions(event)}
                            triggerButtonProps={{ iconBefore: <OperationIcon className='material-icons'>more_vert</OperationIcon> }}>
                            <DropdownItemGroup >
                                {(resource.path === '/' ? rootOptions : options).map(({ icon, label, props }) => (
                                    <Tooltip key={label} content={label} delay={0}>
                                        <DropdownItem
                                            {...props}
                                            spacing='compact'>
                                            <OperationIcon className='material-icons'>{icon}</OperationIcon>
                                        </DropdownItem>
                                    </Tooltip>
                                ))}
                                {extraActions && extraActions.map((action, index) => {
                                    return (
                                        <Tooltip key={action.label} content={action.label} delay={0}>
                                            <DropdownItem
                                                spacing='compact'
                                                key={index}
                                                onClick={() => action.onClick(resource)}>
                                                <OperationIcon className='material-icons'>{action.icon}</OperationIcon>
                                            </DropdownItem>
                                        </Tooltip>
                                    )
                                })}
                            </DropdownItemGroup>
                        </DropdownMenu>
                    </ResourceOperationsMenuContainer></>
                )}
            </div>
        )
    }
}
