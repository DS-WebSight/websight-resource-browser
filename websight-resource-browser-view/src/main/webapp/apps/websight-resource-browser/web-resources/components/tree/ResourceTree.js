import React from 'react';
import Tree from '@atlaskit/tree';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';

import CreateResourceModal from './CreateResourceModal.js';
import CopyMoveResourceModal from './CopyMoveResourceModal.js';
import ResourceTreeNode from './ResourceTreeNode.js';
import ChangelogReadService from '../../services/ChangelogReadService.js';
import ChangelogWriteService from '../../services/ChangelogWriteService.js';
import { getResourcePath } from '../../utils/ChangelogUtil.js';
import { extractParentWithChild } from '../../utils/ResourceBrowserUtil.js';

const PADDING_PER_LEVEL = 15;

const TreeContainer = styled.div`
    padding-left: 10px;
    div {
        outline: none;
    }
    .isDragTarget {
        background: ${colors.mediumLightGrey};
    }
`;

const NoResourcesContainer = styled.div`
    margin-top: 20px;
    padding-right: 10px;
    text-align: center;
`;

export default class ResourceTree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            errorMessages: {},
            dragging: false
        }

        this.addError = this.addError.bind(this);
        this.renderTreeNode = this.renderTreeNode.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
    }

    addError(id, message) {
        this.setState(prevState => ({ errorMessages: { ...prevState.errorMessages, [id]: message } }));
    }

    renderTreeNode({ item, provided, snapshot }) {
        const isModifiable = item.providers.some(({ modifiable }) => modifiable) && !item.notDraggable;

        if (!isModifiable) {
            provided.dragHandleProps = {
                ...provided.dragHandleProps,
                onMouseDown: () => {},
                onDragStart: () => {},
                onTouchStart: () => {}
            };
        }

        return (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={snapshot.combineTargetFor && isModifiable && 'isDragTarget'}
            >
                <ResourceTreeNode
                    {...this.props}
                    onCreateResource={(modalResource) => this.createResourceModal.open(modalResource)}
                    onCopyMoveResource={(modalResource, isMove) => this.copyMoveResourceModal.open(modalResource, isMove)}
                    addError={this.addError}
                    errorMessage={this.state.errorMessages[item.path]}
                    resource={item}
                    dragging={this.state.dragging}
                />
            </div>
        );
    }

    onDragEnd(source, destination) {
        this.setState({ dragging: false })
        const { changelog, onChangelogUpdate, tree } = this.props;
        const sourcePath = tree.items[source.parentId].children[source.index];
        if (!destination || !tree.items[sourcePath].providers.some(provider => provider.modifiable)) {
            return;
        }

        if (source.parentId === destination.parentId) {
            if (tree.items[sourcePath].fromChangelog) {
                this.addError(sourcePath, 'Could not reorder resource. Please save changes to continue.')
                return;
            }

            if (source.index !== destination.index && !tree.items[destination.parentId].orderable) {
                this.addError(sourcePath, `Could not reorder resource, because '${destination.parentId}' is not orderable.`)
                return;
            }
        }

        const { created } = ChangelogReadService.getResourceState(changelog, tree.items[destination.parentId]);
        if (created) {
            this.addError(sourcePath, `Could not move resource, under '${destination.parentId}'. Please save changes to continue.`);
            return;
        }

        const parentChildren = tree.items[destination.parentId].children;
        const destinationPath = getResourcePath(destination.parentId, extractParentWithChild(sourcePath).childName);

        if (sourcePath !== destinationPath && parentChildren.includes(destinationPath)) {
            this.addError(sourcePath, `Could not move resource. '${destination.parentId}' already contains node with such name.`);
            return;
        }

        const orderBefore = parentChildren[destination.index];

        const destinationParentPath = destinationPath.replace(/\/[^/]+$/, '') || '/';
        const destinationParent = tree.items[destinationParentPath];
        if (destinationParent && destinationParent.providers.some(({ modifiable }) => modifiable)) {
            ChangelogWriteService.moveResource(changelog, tree.items[sourcePath], destinationPath, orderBefore);
            onChangelogUpdate(changelog);
        }
    }

    render() {
        const { changelog, onChangelogUpdate, tree, loadingResources } = this.props;

        return (
            <TreeContainer>
                {
                    !Object.keys(tree.items).length && !loadingResources ?
                        <NoResourcesContainer>No resources found</NoResourcesContainer> :
                        <>
                            <Tree
                                tree={tree}
                                renderItem={this.renderTreeNode}
                                offsetPerLevel={PADDING_PER_LEVEL}
                                onDragStart={() => {
                                    this.setState({ dragging: true })
                                }}
                                onDragEnd={this.onDragEnd}
                                isDragEnabled
                                isNestingEnabled
                            />
                            {this.props.extraActions && this.props.extraActions.map((action) => {
                                return action.modal();
                            })}
                            <CreateResourceModal
                                changelog={changelog}
                                onChangelogUpdate={onChangelogUpdate}
                                ref={element => this.createResourceModal = element} />
                            <CopyMoveResourceModal
                                changelog={changelog}
                                onChangelogUpdate={onChangelogUpdate}
                                existingPaths={Object.keys(tree.items)}
                                ref={element => this.copyMoveResourceModal = element} />
                        </>
                }
            </TreeContainer>
        );
    }
}
