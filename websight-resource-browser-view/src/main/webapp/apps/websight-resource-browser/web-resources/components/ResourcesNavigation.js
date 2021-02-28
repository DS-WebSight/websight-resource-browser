import React from 'react';
import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import { DropdownItem, DropdownMenuStateless } from '@atlaskit/dropdown-menu';
import { ContainerHeader, HeaderSection } from '@atlaskit/navigation-next';
import { mutateTree } from '@atlaskit/tree';
import styled from 'styled-components';

import { AvatarIcon } from 'websight-admin/Icons';
import { setUrlHashValue } from 'websight-admin/services/SearchParamsService';

import ResourceTree from './tree/ResourceTree.js';
import ResourceService from '../services/ResourceService.js';
import { RESOURCE_BROWSER_ROOT_PATH, TREE_SELECTED_RESOURCE_CLASS } from '../utils/ResourceBrowserConstants.js';

const BROWSER_TREE_MENU_WRAPPER_CLASS = 'browser-tree-menu-wrapper';
const BROWSER_TREE_MENU_CONTAINER_CLASS = 'browser-tree-menu-container';
const PADDING_PER_LEVEL = 15;

const providerDotStyle = {
    fontSize: '14px',
    paddingRight: '5px',
    verticalAlign: 'text-top'
};

const DropdownLabelContainer = styled.div`
    display: flex;
    align-items: center;
`;

const ProviderSelectContainer = styled.div`
    margin-bottom: 20px;
    padding: 0 20px;
`;

const SelectAllLabel = styled.span`
    font-size: 12px;
    margin-left: 28px;
`;

const ResourcesNavigationWrapper = styled.div`
    .${BROWSER_TREE_MENU_CONTAINER_CLASS}:focus {
        outline: none;
    }
`;

export default class ResourcesNavigation extends React.Component {
    constructor(props) {
        super(props);

        this.focusOnTreeContainer = this.focusOnTreeContainer.bind(this);
        this.onResourceSelect = this.onResourceSelect.bind(this);
        this.onResourceExpand = this.onResourceExpand.bind(this);
        this.localOnTreeMutation = this.localOnTreeMutation.bind(this);
        this.onTreeContainerKeyDown = this.onTreeContainerKeyDown.bind(this);
    }

    focusOnTreeContainer(scrollToResource = true) {
        document.querySelector('.' + BROWSER_TREE_MENU_CONTAINER_CLASS).focus();
        if (scrollToResource) {
            this.scrollToResourceInTree();
        }
    }

    scrollToResourceInTree() {
        const resourceElement = document.querySelector(`.${TREE_SELECTED_RESOURCE_CLASS}`);
        if (resourceElement) {
            const defaultNavigationContainerTop = 56; // global navigation height
            const defaultNavigationContainerBottom = window.innerHeight;

            const treeWrapper = document.querySelector('.' + BROWSER_TREE_MENU_WRAPPER_CLASS);
            const navigationContainer = treeWrapper && treeWrapper.parentElement;
            const navigationContainerRect = navigationContainer && navigationContainer.getBoundingClientRect() || {};
            const navigationContainerTop = navigationContainerRect.top || defaultNavigationContainerTop;
            const navigationContainerBottom = navigationContainerRect.bottom || defaultNavigationContainerBottom;

            const resourceRect = resourceElement.getBoundingClientRect() || {};
            const resourceTop = resourceRect.top;
            const resourceBottom = resourceRect.bottom;

            if (resourceTop < navigationContainerTop) {
                resourceElement.scrollIntoView({ block: 'start' });
            } else if (resourceBottom > navigationContainerBottom) {
                resourceElement.scrollIntoView({ block: 'end' });
            }
        }
    }

    onResourceSelect(resource) {
        const { onResourceSelect } = this.props;

        setUrlHashValue(resource.path);
        onResourceSelect(resource, this.focusOnTreeContainer);
    }

    localOnTreeMutation(mutatedTree, scrollToResource, callback) {
        const { onTreeMutation } = this.props;

        onTreeMutation(mutatedTree, () => {
            this.focusOnTreeContainer(scrollToResource);
            if (callback) callback()
        });
    }

    onResourceExpand(resource) {
        const { selectedProviders, onNewResources, tree } = this.props;

        if (resource.hasChildren) {
            ResourceService.listResources(
                { path: resource.path, providers: selectedProviders },
                (resources) => {
                    tree.items[resource.id].isLoading = false;
                    if (resource.isCopy) {
                        resources = resources.map((node) =>
                            ({
                                ...node,
                                id: node.id.replace(resource.path, resource.id),
                                name: resource.path === node.path ? resource.name : node.name,
                                isCopy: true,
                                children: node.children.map(child => child.replace(resource.path, resource.id))
                            })
                        )
                    }
                    onNewResources(resources, false, () => this.focusOnTreeContainer(false));
                }
            )
        }
    }

    onTreeContainerKeyDown(event) {
        const isFocused = document.activeElement.className === BROWSER_TREE_MENU_CONTAINER_CLASS;
        if (!isFocused) {
            return;
        }

        const { selectedResource, tree, onOpenResourcesEditor } = this.props;

        const changeNode = (changeDirection = 1) => {
            let nodes = [];

            const populateNodes = (items) => {
                items.forEach((item) => {
                    if (item.path && !nodes.includes(item.path)) {
                        nodes.push(item.path);
                    }
                    if (item.hasChildren && item.children.length) {
                        const children = item.children.map((path) => tree.items[path])
                        populateNodes(children);
                    }
                })
            }

            populateNodes(Object.values(tree.items));

            const collapsedNodes = nodes.filter(path => !tree.items[path].isExpanded && tree.items[path].children.length);
            nodes = nodes.filter(path => !collapsedNodes.some((val) => path.includes(`${val}/`)));
            const indexOfCurrentResource = nodes.indexOf(selectedResource.path);

            if ((changeDirection < 0 && indexOfCurrentResource === 0) ||
                (changeDirection > 0 && indexOfCurrentResource === nodes.length - 1)) {
                return;
            }

            const resourceToSelect = tree.items[nodes[indexOfCurrentResource + changeDirection]];
            this.onResourceSelect(resourceToSelect);
        }

        switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            changeNode(1);
            break;
        case 'ArrowUp':
            event.preventDefault();
            changeNode(-1);
            break;
        case 'ArrowRight':
            event.preventDefault();
            if (!tree.items[selectedResource.id].isExpanded && selectedResource.hasChildren) {
                this.localOnTreeMutation(mutateTree(tree, selectedResource.id, { isExpanded: true, isLoading: true }), false, () => this.onResourceExpand(selectedResource));
            }
            break;
        case 'ArrowLeft':
            event.preventDefault();
            if (!tree.items[selectedResource.id].isExpanded) {
                let parentResource = selectedResource.path.replace(/\/[^/]+$/, '/')
                parentResource = parentResource === '/' ? parentResource : parentResource.replace(/\/$/, '');
                this.onResourceSelect(tree.items[parentResource]);
            } else {
                this.localOnTreeMutation(mutateTree(tree, selectedResource.id, { isExpanded: false }))
            }
            break;
        case ' ':
            event.preventDefault();
            if (selectedResource.hasContent) {
                onOpenResourcesEditor(selectedResource, this.focusOnTreeContainer);
            }
            break;
        default:
            break;
        }
    }

    render() {
        const { changelog, loadingResources, onChangelogUpdate, providersMenuOpen, tree, providers,
            selectedResource, selectedProviders, toggleProvidersMenu,
            onProvidersChange, onOpenResourcesEditor, onTreeRefresh, extraActions } = this.props;

        const selectedProvidersValues = selectedProviders.map(selected => selected.value);

        const DropdownTriggerButton = (
            <Button style={{ width: '100%' }}>
                <DropdownLabelContainer>
                    <span style={{ marginRight: '10px' }}>Providers:</span>
                    {
                        selectedProviders.length > 0 ?
                            providers
                                .filter((provider) => selectedProvidersValues.includes(provider.value))
                                .map((provider) =>
                                    <i key={`icon-${provider.label}`} className='material-icons'
                                        style={{ ...providerDotStyle, color: provider.color }}>
                                        fiber_manual_record
                                    </i>)
                            : 'none'
                    }
                </DropdownLabelContainer>
            </Button>
        )

        return (
            <ResourcesNavigationWrapper className={BROWSER_TREE_MENU_WRAPPER_CLASS}>
                <div
                    className={BROWSER_TREE_MENU_CONTAINER_CLASS}
                    tabIndex='0'
                    onKeyDown={this.onTreeContainerKeyDown}
                    style={{ paddingBottom: '40px' }}
                >
                    <HeaderSection>
                        {({ css }) => (
                            <div style={{ ...css, paddingBottom: PADDING_PER_LEVEL }}>
                                <ContainerHeader
                                    before={() => (
                                        <AvatarIcon className='material-icons-outlined'>
                                            account_tree
                                        </AvatarIcon>
                                    )}
                                    href={RESOURCE_BROWSER_ROOT_PATH}
                                    text="Resource Browser"
                                />
                            </div>
                        )}
                    </HeaderSection>
                    <ProviderSelectContainer>
                        <DropdownMenuStateless
                            trigger={DropdownTriggerButton}
                            appearance='tall'
                            shouldFitContainer
                            isOpen={providersMenuOpen}
                            onOpenChange={toggleProvidersMenu}
                        >
                            {
                                providers.map((provider) =>
                                    <DropdownItem
                                        id={provider.label}
                                        key={provider.label}
                                        isCompact={true}
                                        onClick={() => {
                                            if (selectedProvidersValues.includes(provider.value)) {
                                                onProvidersChange(selectedProviders.filter((selected) => selected.value !== provider.value));
                                            } else {
                                                onProvidersChange([...selectedProviders, provider])
                                            }
                                        }}
                                    >
                                        <Checkbox
                                            label={provider.pluralLabel}
                                            isChecked={selectedProvidersValues.includes(provider.value)}
                                            theme={(current, props) => {
                                                props.tokens.icon.boxColor.checked.light = provider.color;
                                                props.tokens.icon.boxColor.hovered.light = provider.color;
                                                props.tokens.icon.boxColor.active.light = provider.color;
                                                props.tokens.icon.boxColor.hoveredAndChecked.light = provider.color;
                                                const currentProps = current(props);
                                                return {
                                                    ...currentProps
                                                }
                                            }}
                                        />
                                    </DropdownItem>
                                )
                            }
                            <DropdownItem
                                isCompact={true}
                                onClick={() => {
                                    if (selectedProviders.length === providers.length) {
                                        onProvidersChange([]);
                                    } else {
                                        onProvidersChange(providers)
                                    }
                                }}
                            >
                                <SelectAllLabel>{selectedProviders.length === providers.length ? 'Deselect All' : 'Select All'}</SelectAllLabel>
                            </DropdownItem>
                        </DropdownMenuStateless>
                    </ProviderSelectContainer>
                    <ResourceTree
                        tree={tree}
                        changelog={changelog}
                        selectedResource={selectedResource}
                        selectedProviders={selectedProviders}
                        extraActions={extraActions}
                        onChangelogUpdate={onChangelogUpdate}
                        onSelect={this.onResourceSelect}
                        onTreeMutation={this.localOnTreeMutation}
                        onExpand={this.onResourceExpand}
                        onOpenResourcesEditor={onOpenResourcesEditor}
                        onTreeRefresh={onTreeRefresh}
                        loadingResources={loadingResources}
                    />
                </div>
            </ResourcesNavigationWrapper>
        )
    }
}
