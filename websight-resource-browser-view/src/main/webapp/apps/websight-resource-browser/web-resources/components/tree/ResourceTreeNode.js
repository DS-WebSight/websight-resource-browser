import React from 'react';
import Spinner from '@atlaskit/spinner';
import InlineEdit from '@atlaskit/inline-edit';
import Tooltip from '@atlaskit/tooltip';
import TextField from '@atlaskit/textfield';
import { mutateTree } from '@atlaskit/tree';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';
import { ResourceIcon } from 'websight-admin/Icons';

import ResourceOperationsMenu from './ResourceOperationsMenu.js';
import ChangelogReadService from '../../services/ChangelogReadService.js';
import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import { ROOT_PATH } from '../../services/ResourceService.js';
import ResourceProviderDotMarkerContainer from '../../utils/ResourceProviderDotMarkerContainer.js'
import { TREE_SELECTED_RESOURCE_CLASS } from '../../utils/ResourceBrowserConstants.js';
import { extractParentWithChild } from '../../utils/ResourceBrowserUtil.js';

const chevronButtonStyle = {
    height: '20px',
    overflow: 'hidden',
    padding: '0',
    display: 'flex',
    flexDirection: 'row',
    width: '100%'
};

const chevronIconStyle = {
    display: 'block',
    cursor: 'pointer',
    fontSize: '20px',
    minWidth: '20px',
    width: '20px'
};

const treeNodeStyle = {
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    padding: '0 5px 0 2px'
};

const treeSelectedNodeStyle = {
    background: colors.lightBlue,
    padding: '0 5px 0 2px'
}

const TreeNodeContainer = styled.div`
    align-items: center;
    box-sizing: border-box;
    color: rgb(23, 43, 77);
    display: flex;
    font-size: 12px;
    margin-left: 10px;
    min-height: 24px;
    outline: none;
    padding: 0;
    position: relative;

    &.loading {
        pointer-events: none;
    }
    &.created > div {
        span {
            font-weight: bold;
        }
        border-left: 2px solid ${colors.green};
    }
    &.modified > div {
        span {
            font-weight: bold;
        }
        border-left: 2px solid ${colors.yellow};
    }
    &.removed > div {
        span {
            opacity: .75;
            font-weight: bold;
        }
        border-left: 2px solid ${colors.red};
    }
    &.dragging {
        opacity: 0.4;
    }
`;

const ChevronIconContainer = styled.div`
    display: inline-block;
    min-width: 20px;
    overflow: hidden;
    &:hover i {
        border-radius: 5px;
        background: ${colors.lightGrey};
    }
`;

const ResourceNameEditViewContainer = styled.div`
    form, form div {
        margin: 0;
    }

    input {
        font-size: 12px;
        border: 0;
        padding: 0;
        height: 24px
    }
`;

const ErrorIcon = styled.i`
    color: ${colors.red};
    display: flex;
    font-size: 16px;
    margin-right: 4px;
`

const DOUBLE_CLICK_TIMESPACE = 200;

export default class ResourceTreeNode extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editing: false
        }

        this.clicksCount = 0;
        this.singleClickTimer;

        this.onSingleClick = this.onSingleClick.bind(this);
        this.onDoubleClick = this.onDoubleClick.bind(this);
        this.onResourceClick = this.onResourceClick.bind(this);
        this.onResourceRightClick = this.onResourceRightClick.bind(this);
        this.toggleExpanded = this.toggleExpanded.bind(this);
        this.resourceNameRender = this.resourceNameRender.bind(this);
        this.onConfirmRename = this.onConfirmRename.bind(this);
    }

    toggleExpanded(resource) {
        const { tree, onTreeMutation, onExpand } = this.props;

        if (!resource.isExpanded) {
            onTreeMutation(mutateTree(tree, resource.id, { isExpanded: true, isLoading: true }), false, onExpand(resource));
        } else {
            onTreeMutation(mutateTree(tree, resource.id, { isExpanded: false }), false)
        }
    }

    onSingleClick(resource) {
        const { onSelect, onTreeMutation, tree, onExpand } = this.props;

        onSelect(resource);
        if (!resource.isExpanded) {
            onTreeMutation(mutateTree(tree, resource.id, { isExpanded: true, isLoading: true }), false, onExpand(resource));
        }
    }

    onDoubleClick(resource) {
        const { onOpenResourcesEditor } = this.props;

        onOpenResourcesEditor(resource);
    }

    onResourceRightClick(resource) {
        const { onSelect } = this.props;
        onSelect(resource);
        resource.showContextMenu = true;
    }

    onResourceClick(resource) {
        resource.showContextMenu = false;
        if (!resource.hasContent) {
            this.onSingleClick(resource);
        } else {
            this.clicksCount++;

            if (this.clicksCount === 1) {
                this.singleClickTimer = setTimeout(
                    () => {
                        this.clicksCount = 0;
                        this.onSingleClick(resource);
                    },
                    DOUBLE_CLICK_TIMESPACE
                );
            } else if (this.clicksCount === 2) {
                this.onDoubleClick(resource);
            }
        }
    }

    renderChevronIcon(node) {
        if (node.isLoading) {
            return <Spinner size={16} />
        } else {
            return (
                <i className='material-icons-outlined' style={chevronIconStyle}>
                    {node.isExpanded ? 'keyboard_arrow_down_outlined_icon' : 'keyboard_arrow_right_outlined_icon'}
                </i>
            )
        }
    }

    providerMarkers(resource) {
        const markers = resource.providers
            .map((provider) =>
                <>
                    <ResourceProviderDotMarkerContainer style={{ background: provider.color }}>{provider.label}</ResourceProviderDotMarkerContainer>
                </>
            )

        if (markers.length) {
            return markers;
        } else {
            return <ResourceProviderDotMarkerContainer style={{ background: colors.grey }}>Synthetic Resource</ResourceProviderDotMarkerContainer>
        }
    }

    resourceNameRender(resource) {
        const { editing } = this.state;
        const { name } = resource;
        if (editing) {
            return (
                <ResourceNameEditViewContainer>
                    <InlineEdit
                        defaultValue={name}
                        startWithEditViewOpen={true}
                        hideActionButtons={true}
                        editView={fieldProps => (
                            <form>
                                <TextField
                                    {...fieldProps}
                                    autoFocus
                                    appearance='none'
                                    isCompact={true}
                                />
                            </form>
                        )}
                        readView={() => this.setState({ editing: false })}
                        onConfirm={this.onConfirmRename}
                    />
                </ResourceNameEditViewContainer>
            )
        }
        return <span>{name}</span>
    }

    onConfirmRename(value) {
        const { addError, changelog, onChangelogUpdate, resource, tree } = this.props;
        const { path } = resource;

        const editedResourceParentPath = extractParentWithChild(path).parentPath;
        const editedResourceParent = tree.items[editedResourceParentPath];

        const editedResourceParentId = Object.keys(tree.items).filter(id => id !== 'root')
            .find(key => tree.items[key].path === editedResourceParentPath);

        const orderBeforeIndex = editedResourceParent.children.findIndex(child => child === path);
        const orderBefore = orderBeforeIndex + 1 < editedResourceParent.children.length
            ? editedResourceParent.children[orderBeforeIndex + 1] : null;

        const destination = editedResourceParentPath === '/' ? editedResourceParentPath + value :
            editedResourceParentPath + '/' + value;

        const alreadyContainsChild = tree.items[editedResourceParentId].children.filter(child => child !== path)
            .some(child => child === destination);

        if (alreadyContainsChild) {
            addError(path, `Could not change resource name to '${value}' because it is already present.`);
        } else {
            this.setState({ editing: false }, () => {
                if (destination === path) {
                    ChangelogWriteService.undoMoveResource(changelog, resource);
                } else {
                    ChangelogWriteService.moveResource(changelog, resource, destination, orderBefore);
                }
                onChangelogUpdate(changelog);
            });
        }
    }

    render() {
        const { editing } = this.state;
        const { changelog, onChangelogUpdate, onCreateResource, resource, selectedResource, loadingResources,
            onTreeRefresh, onCopyMoveResource, tree, errorMessage, dragging, extraActions } = this.props;

        const selected = resource.id === selectedResource.id;
        const { created, modified, removed } = ChangelogReadService.getResourceState(changelog, resource);
        const isLoadingRoot = resource.path === ROOT_PATH && resource.isLoading;
        const modifiable = (resource.providers || []).some(provider => provider.modifiable);

        const treeNode = (
            <TreeNodeContainer
                className={[
                    loadingResources && 'loading',
                    created ? 'created' : (removed ? 'removed' : (modified && 'modified')),
                    dragging && !modifiable && 'dragging'
                ].join(' ')}
            >
                <div style={{ ...chevronButtonStyle }} className={selected && TREE_SELECTED_RESOURCE_CLASS}>
                    <ChevronIconContainer onClick={() => this.toggleExpanded(resource)}>
                        {resource.hasChildren ? this.renderChevronIcon(resource) : <i style={chevronIconStyle} />}
                    </ChevronIconContainer>
                    <div
                        onClick={() => this.onResourceClick(resource)}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            this.onResourceRightClick(resource);
                        }}
                        style={{ ...treeNodeStyle, ...(selected ? treeSelectedNodeStyle : {}) }}
                    >
                        {errorMessage ? (
                            <Tooltip content={errorMessage} delay={0}>
                                <ErrorIcon className='material-icons'>error</ErrorIcon>
                            </Tooltip>
                        ) : (
                            <ResourceIcon
                                isFolder={resource.isFolder}
                                isExpanded={resource.isExpanded}
                            />
                        )}
                        {this.resourceNameRender(resource)}
                        {!isLoadingRoot && this.providerMarkers(resource)}
                    </div>
                </div>
            </TreeNodeContainer>
        );

        return (
            <>
                {modifiable && !removed && !editing && !resource.isCopy ? (
                    <ResourceOperationsMenu
                        onCreateResource={onCreateResource}
                        onCopyMoveResource={onCopyMoveResource}
                        onRenameResource={() => this.setState({ editing: true })}
                        changelog={changelog}
                        onChangelogUpdate={onChangelogUpdate}
                        resource={resource}
                        selected={selected}
                        loadingResources={loadingResources}
                        extraActions={extraActions}
                        onTreeRefresh={() => onTreeRefresh(ChangelogReadService.getExpandedPaths(changelog, tree))}
                        onNodeRefresh={() => onTreeRefresh(ChangelogReadService.getExpandedPaths(changelog, tree).filter(path => path.includes(resource.path)))}
                    >
                        {treeNode}
                    </ResourceOperationsMenu>
                ) : treeNode}
            </>
        );
    }
}
