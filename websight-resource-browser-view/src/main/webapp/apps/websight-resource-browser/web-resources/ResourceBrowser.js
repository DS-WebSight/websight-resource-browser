import React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import { LayoutManager, NavigationProvider } from '@atlaskit/navigation-next';
import Page from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Tooltip from '@atlaskit/tooltip';
import { mutateTree } from '@atlaskit/tree';
import styled from 'styled-components';

import Breadcrumbs from 'websight-admin/Breadcrumbs';
import ListenForKeyboardShortcut from 'websight-admin/ListenForKeyboardShortcut';
import { PageContentContainer } from 'websight-admin/Containers';
import GlobalNavigation from 'websight-admin/GlobalNavigation';
import { getUrlHashValue, setUrlHashValue } from 'websight-admin/services/SearchParamsService';
import { AUTH_CONTEXT_UPDATED } from 'websight-rest-atlaskit-client/RestClient';
import { getWebFragments } from 'websight-fragments-esm';
import { errorNotification } from '/apps/websight-rest-atlaskit-client/web-resources/js/Notification.js';

import ChangelogPopup from './components/ChangelogPopup.js';
import ChangelogReadService from './services/ChangelogReadService.js';
import { getSelectedResourcePath } from './utils/ResourceBrowserUtil.js';
import { hasUnsupportedExtension } from './utils/ContentResourceUtil.js';
import ResourceHeader from './components/ResourceHeader.js';
import ResourceDetails from './components/ResourceDetails.js';
import ResourceEditors from './components/ResourceEditors.js';
import ResourceService, { ROOT_PATH, VIRTUAL_ROOT_PATH } from './services/ResourceService.js';
import ResourcesNavigation from './components/ResourcesNavigation.js';
import { ResourceUnavailable } from './components/ResourceUnavailable.js';
import { RESOURCE_BROWSER_ROOT_PATH, TREE_SELECTED_RESOURCE_CLASS } from './utils/ResourceBrowserConstants.js';
import UnknownFileTypeOpenConfirmationModal from './components/modals/UnknownFileTypeOpenConfirmationModal.js';

const SELECTED_PROVIDERS_LOCAL_STORAGE_KEY = 'websight.resource-browser.selected.providers';

const ButtonGroupContainer = styled.div`
    height: 32px
`;

const ResourcePageContentContainer = styled(PageContentContainer)`
    display: flex;
    flex-direction: column;
    max-height: 100%;
    padding-bottom: 0;
`;

const ResourcesDetailsContainer = styled.div`
    --elements-above-height: 165px; ${'' /* Modify to get rid of page scroll bar */}

    display: flex;
    flex-direction: column;
    flex: 1 1 calc(100vh - var(--elements-above-height));
    overflow: hidden;
`;

const EditorsSectionContainer = styled.div`
    flex-grow: 1;
    padding-top: 5px;
`;

const EditorsSectionInsideContainer = styled.div`
    overflow: hidden;
    height: 100%;
    max-height: 1000px;
`;

const DetailsSectionContainer = styled.div`
    --tabs-row-height: 50px;

    flex-grow: 0;
    height: auto;
    flex-basis: auto;
    min-height: var(--tabs-row-height);
    margin-bottom: 10px;
    height: 100vh;
    max-height: 1000px;

    & > div {
        height: 100%;
    }
`;

export default class ResourceBrowser extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            tree: { items: { ...ResourceService.initialTree }, rootId: VIRTUAL_ROOT_PATH },
            providers: [],
            changelog: {},
            selectedResource: {},
            selectedProviders: [],
            openedResourceEditors: [],
            recentlyOpenedEditor: {},
            providersMenuOpen: false,
            loadingResources: true,
            savingChanges: false,
            extraActions: null
        };

        this.onTreeMutation = this.onTreeMutation.bind(this);
        this.fillTreeWithNewResources = this.fillTreeWithNewResources.bind(this);
        this.onHashChange = this.onHashChange.bind(this);
        this.onProvidersChange = this.onProvidersChange.bind(this);
        this.onOpenResourcesEditor = this.onOpenResourcesEditor.bind(this);
        this.onCloseResourcesEditor = this.onCloseResourcesEditor.bind(this);
        this.openResourcesForPath = this.openResourcesForPath.bind(this);
        this.onSaveChanges = this.onSaveChanges.bind(this);
        this.onChangelogUpdate = this.onChangelogUpdate.bind(this);
        this.refreshTree = this.refreshTree.bind(this);
        this.preventLeavingThePage = this.preventLeavingThePage.bind(this);
        this.onRevertChanges = this.onRevertChanges.bind(this);

        getWebFragments('websight.admin.resourcebrowser.extra.actions', (fragments) => this.setState({ extraActions: fragments }), errorNotification);
    }

    componentDidMount() {
        window.addEventListener('beforeunload', this.preventLeavingThePage);
        window.addEventListener('hashchange', this.onHashChange);
        window.addEventListener(AUTH_CONTEXT_UPDATED, () => {
            if (this.state.providers && this.state.providers.length) {
                this.refreshTree();
            }
        });
        this.loadDataFromUrl();
    }

    componentWillUnmount() {
        window.removeEventListener('beforeunload', this.preventLeavingThePage);
        window.removeEventListener('hashchange', this.onHashChange);
    }

    preventLeavingThePage(e) {
        const { changelog } = this.state;

        if (ChangelogReadService.isEmpty(changelog)) {
            delete e['returnValue'];
        } else {
            e.returnValue = '';
            e.preventDefault();
        }
    }

    onHashChange() {
        this.loadDataFromUrl();
    }

    loadDataFromUrl() {
        ResourceService.listProviders((providers) => {
            if (!providers.length) return;

            const urlHash = getUrlHashValue();
            const selectedProviders = this.getSelectedProviders(providers);
            localStorage.setItem(SELECTED_PROVIDERS_LOCAL_STORAGE_KEY, JSON.stringify(selectedProviders));

            this.setState(
                { providers, selectedProviders: selectedProviders },
                () => {
                    if (urlHash) {
                        this.openResourcesForPath(urlHash);
                    } else {
                        this.openResourcesForRoot();
                    }
                }
            );
        });
    }

    getSelectedProviders(providers) {
        const selectedProvidersFromStorage = JSON.parse(localStorage.getItem(SELECTED_PROVIDERS_LOCAL_STORAGE_KEY));
        if (!selectedProvidersFromStorage) {
            return providers;
        }
        const selectedProvidersValues = selectedProvidersFromStorage.map(selectedProvider => selectedProvider.value);
        return providers.filter(provider =>
            selectedProvidersValues.includes(provider.value)
        );
    }

    openResourcesForRoot() {
        const { selectedProviders } = this.state;

        ResourceService.listResources(
            { providers: selectedProviders },
            (resources) => {
                this.fillTreeWithNewResources(resources);
                const rootResource = resources.find(({ path }) => path === ROOT_PATH);
                if (rootResource) {
                    this.setState({ selectedResource: rootResource });
                }
            }
        );
    }

    openResourcesForPath(resourcePath, providerValue) {
        const { providers, selectedProviders } = this.state;

        const providersToCheck = [...selectedProviders];

        const selectResourceOnTree = () => {
            const resources = resourcePath.split('/')
                .map((path, index) => resourcePath.split('/').slice(0, ++index).join('/'))
                .filter(path => path);

            ResourceService.listResources(
                { paths: ['/', ...resources], providers: providersToCheck },
                (resourcesData) => {
                    resourcesData = resourcesData.map(resource => {
                        if (resourcePath.includes(resource.path)) {
                            return { ...resource, isExpanded: true };
                        }
                        return resource;
                    });
                    this.fillTreeWithNewResources(resourcesData)
                    const resourceFromHash = resourcesData.find(({ path }) => path === resourcePath)
                    if (resourceFromHash) {
                        this.setState({ selectedResource: resourceFromHash },
                            () => {
                                setUrlHashValue(resourcePath);
                                const el = document.querySelector(`.${TREE_SELECTED_RESOURCE_CLASS}`);
                                el && el.scrollIntoView({ block: 'center' });
                            }
                        );
                    } else {
                        this.setState({ selectedResource: {} });
                    }
                }
            )
        }

        if (resourcePath && providerValue) {
            const provider = providers.find(({ value }) => value === providerValue);
            if (!providersToCheck.includes(provider)) {
                providersToCheck.push(provider);
                this.onProvidersChange(providersToCheck, selectResourceOnTree);
            } else {
                selectResourceOnTree();
            }
        } else if (resourcePath) {
            selectResourceOnTree();
        }
    }

    onTreeMutation(mutatedTree, callback) {
        this.setState({ tree: mutatedTree }, callback);
    }

    fillTreeWithNewResources(resources, reinitTreeItems = false, callback) {
        this.setState((prevState) => {
            let newTree = reinitTreeItems ?
                { ...prevState.tree, items: ResourceService.initialTree } : prevState.tree;

            const expandedPaths = Object.entries(prevState.tree.items)
                .map(([key, value]) => value.isExpanded && key)
                .filter((path) => path);

            resources.forEach((resource) => {
                if (Object.keys(newTree.items).includes(resource.id)) {
                    const existingResourceData = newTree.items[resource.id];
                    const children = (!resource.children.length && resource.hasChildren) ? existingResourceData.children : resource.children;
                    const isExpanded = resource.isExpanded || expandedPaths.includes(resource.id);

                    newTree = mutateTree(newTree, resource.id, { ...existingResourceData, ...resource, children, isExpanded });
                } else {
                    newTree.items[resource.id] = { ...resource };
                }
            });

            if (!newTree.items[VIRTUAL_ROOT_PATH].children.length && newTree.items[ROOT_PATH]) {
                newTree.items[VIRTUAL_ROOT_PATH].children = [ROOT_PATH];
            }
            const selectedResource = newTree.items[getSelectedResourcePath(newTree, prevState.selectedResource.id || getUrlHashValue())];
            if (prevState.selectedResource.id !== selectedResource.id) {
                setUrlHashValue(selectedResource.id);
            }
            if (resources.length === 0) {
                selectedResource.isLoading = false;
                selectedResource.hasChildren = false;
            }

            return {
                tree: ChangelogReadService.includeCreatedResources(prevState.changelog, newTree),
                selectedResource: selectedResource,
                loadingResources: false
            };
        }, callback);
    }

    onProvidersChange(providersArray, callback) {
        const { tree, providers } = this.state;
        localStorage.setItem(SELECTED_PROVIDERS_LOCAL_STORAGE_KEY, JSON.stringify(providersArray));
        if (!providers.length) return;

        const expandedPaths = Object.entries(tree.items)
            .map(([key, value]) => value.isExpanded && key)
            .filter((path) => !!path);

        this.setState(
            { selectedProviders: providersArray },
            () => {
                if (providersArray.length) {
                    this.refreshTree(expandedPaths, callback);
                } else {
                    this.fillTreeWithNewResources([], true, callback);
                }
            }
        );
    }

    onOpenResourcesEditor(resource, callback, ignoreExtensionCheck) {
        const onOpenResourceEditorWithoutExtensionCheck = () => this.onOpenResourcesEditor(resource, callback, true);

        this.setState((prevState) => {
            const { openedResourceEditors } = prevState;
            let mutatedOpenedResourceEditors = [...openedResourceEditors];

            const isResourceEditorOpen = openedResourceEditors
                .map((openedResource) => openedResource.path)
                .includes(resource.path);

            if (!isResourceEditorOpen) {
                if (!ignoreExtensionCheck && hasUnsupportedExtension(resource.name)) {
                    this.unknownFileTypeOpenConfirmationModal.open(resource, onOpenResourceEditorWithoutExtensionCheck);
                    return prevState;
                } else {
                    mutatedOpenedResourceEditors.push(resource);
                }
            } else {
                mutatedOpenedResourceEditors = openedResourceEditors
                    .map((openedResourceEditor) => openedResourceEditor.path === resource.path ? resource : openedResourceEditor);
            }
            // copy resource to be sure recentlyOpenedEditor will be updated in state:
            const resourceCopy = Object.assign({}, resource);
            return { openedResourceEditors: mutatedOpenedResourceEditors, recentlyOpenedEditor: resourceCopy };
        }, callback)
    }

    onCloseResourcesEditor(resource) {
        this.setState((prevState) => {
            const { openedResourceEditors } = prevState;

            const filteredOpenedResourceEditors = openedResourceEditors
                .filter((openedResource) => openedResource.path !== resource.path);

            return { openedResourceEditors: filteredOpenedResourceEditors, recentlyOpenedEditor: {} };
        })
    }

    editorSectionInsideContainerClassName() {
        const { openedResourceEditors, selectedResource } = this.state;

        const isEditorOpen = openedResourceEditors.length;
        const isResourceWitPropsSelected = (selectedResource.providers && selectedResource.providers.length);

        return (isEditorOpen || isResourceWitPropsSelected) ? 'opened' : '';
    }

    refreshTree(expandedPaths, callback) {
        const { tree, changelog } = this.state;

        if (!expandedPaths) {
            expandedPaths = ChangelogReadService.getExpandedPaths(changelog, tree);
        }

        this.setState({ loadingResources: true });
        ResourceService.listResources(
            { paths: expandedPaths, providers: this.state.selectedProviders },
            (resources) => {
                this.fillTreeWithNewResources(resources, expandedPaths.includes(ROOT_PATH));
                callback && callback();
            }
        )
    }

    onSaveChanges() {
        const { changelog, tree, savingChanges } = this.state;

        if (savingChanges) return;

        const expandedPaths = ChangelogReadService.getExpandedPaths(changelog, tree);
        const changesRelatedTo = ChangelogReadService.getChangeTypes(changelog);

        this.setState(() => {
            if (changesRelatedTo.tree) {
                return { savingChanges: true, selectedResource: {} }
            }
            return { savingChanges: true }

        }, ResourceService.saveChanges(this.state.changelog,
            () => {
                this.setState({ changelog: {}, savingChanges: false }, () => {
                    if (changesRelatedTo.tree) {
                        this.refreshTree(expandedPaths);
                    }
                });
            },
            () => {
                this.setState({ savingChanges: false });
            }
        ));
    }

    onChangelogUpdate(updatedChangelog) {
        this.setState(prevState => {
            let newTree = ChangelogReadService.excludeCreatedResources(prevState.changelog, prevState.tree);
            newTree = ChangelogReadService.includeCreatedResources(updatedChangelog, newTree);
            const selectedResourcePath = getSelectedResourcePath(newTree, prevState.selectedResource.path);
            if (selectedResourcePath !== prevState.selectedResource.path) {
                setUrlHashValue(selectedResourcePath);
            }
            return { changelog: updatedChangelog, selectedResource: newTree.items[selectedResourcePath] || {}, tree: newTree }
        });
    }

    onRevertChanges() {
        const { changelog, tree } = this.state;
        const expandedPaths = ChangelogReadService.getExpandedPaths(changelog, tree);
        const changesRelatedTo = ChangelogReadService.getChangeTypes(changelog);

        this.setState(() => {
            if (changesRelatedTo.tree) {
                return { changelog: {}, selectedResource: {} }
            }
            return { changelog: {} }
        }, () => {
            if (changesRelatedTo.tree) {
                this.refreshTree(expandedPaths);
            }
        })
    }

    render() {
        const { loadingResources, tree, providers, selectedResource,
            selectedProviders, providersMenuOpen, changelog,
            openedResourceEditors, recentlyOpenedEditor, savingChanges, extraActions } = this.state;

        const isChangelogEmpty = ChangelogReadService.isEmpty(this.state.changelog);

        return (
            <>
                <ListenForKeyboardShortcut
                    key='CtrlLeft+S'
                    keyCodes={['ControlLeft', 'KeyS']}
                    callback={() => !isChangelogEmpty && !savingChanges && this.onSaveChanges()}
                />
                <ListenForKeyboardShortcut
                    key='CtrlRight+S'
                    keyCodes={['ControlRight', 'KeyS']}
                    callback={() => !isChangelogEmpty && !savingChanges && this.onSaveChanges()}
                />
                <NavigationProvider>
                    <LayoutManager
                        key='layout-manager'
                        globalNavigation={GlobalNavigation}
                        productNavigation={() => null}
                        containerNavigation={() =>
                            <ResourcesNavigation
                                loadingResources={loadingResources}
                                changelog={changelog}
                                providersMenuOpen={providersMenuOpen}
                                toggleProvidersMenu={({ isOpen, event }) => event && this.setState(() => ({ providersMenuOpen: isOpen }))}
                                tree={tree}
                                providers={providers}
                                extraActions={extraActions}
                                selectedResource={selectedResource}
                                selectedProviders={selectedProviders}
                                onChangelogUpdate={this.onChangelogUpdate}
                                onResourceSelect={(resource, callback) => this.setState({ selectedResource: resource }, callback)}
                                onProvidersChange={this.onProvidersChange}
                                onNewResources={this.fillTreeWithNewResources}
                                onTreeMutation={this.onTreeMutation}
                                onTreeRefresh={this.refreshTree}
                                onOpenResourcesEditor={this.onOpenResourcesEditor}
                            />
                        }
                        experimental_horizontalGlobalNav
                    >
                        <Page>
                            <ResourcePageContentContainer>
                                <PageHeader
                                    breadcrumbs={
                                        <Breadcrumbs breadcrumbs={[
                                            { text: 'Resource Browser', path: RESOURCE_BROWSER_ROOT_PATH, reactPath: '' }
                                        ]} />
                                    }
                                    actions={
                                        <ButtonGroupContainer>
                                            <ButtonGroup>
                                                <ChangelogPopup changelog={changelog} />
                                                <Tooltip delay={0} content='CTRL+S'>
                                                    <Button
                                                        appearance='primary'
                                                        isDisabled={isChangelogEmpty}
                                                        isLoading={this.state.savingChanges}
                                                        onClick={this.onSaveChanges}>
                                                        Save
                                                    </Button>
                                                </Tooltip>
                                                <Button
                                                    isDisabled={isChangelogEmpty || this.state.savingChanges}
                                                    onClick={() => this.onRevertChanges()}>
                                                    Revert All
                                                </Button>
                                            </ButtonGroup>
                                        </ButtonGroupContainer>
                                    }
                                >
                                    Resources
                                </PageHeader>
                                <ResourcesDetailsContainer>
                                    <ResourceHeader
                                        providers={selectedProviders}
                                        resource={selectedResource}
                                        openResourcesForPath={this.openResourcesForPath}
                                    />
                                    <ResourceUnavailable shadowedBy={selectedResource.shadowedBy} />
                                    <EditorsSectionContainer>
                                        <EditorsSectionInsideContainer className={this.editorSectionInsideContainerClassName()}>
                                            <ResourceEditors
                                                recentlyOpenedEditor={recentlyOpenedEditor}
                                                openedResourceEditors={openedResourceEditors}
                                                onOpenedResourceEditorChange={this.onOpenedResourceEditorChange}
                                                onClose={this.onCloseResourcesEditor}
                                                selectedProviders={selectedProviders}
                                                openResourcesForPath={this.openResourcesForPath}
                                                onOpenResourcesEditor={this.onOpenResourcesEditor}
                                                changelog={changelog}
                                                onChangelogUpdate={this.onChangelogUpdate}
                                            />
                                        </EditorsSectionInsideContainer>
                                    </EditorsSectionContainer>
                                    <DetailsSectionContainer>
                                        <ResourceDetails
                                            resource={selectedResource}
                                            changelog={changelog}
                                            onChangelogUpdate={this.onChangelogUpdate}
                                        />
                                    </DetailsSectionContainer>
                                </ResourcesDetailsContainer>
                            </ResourcePageContentContainer>
                        </Page>
                    </LayoutManager>
                </NavigationProvider>
                <UnknownFileTypeOpenConfirmationModal ref={(element) => this.unknownFileTypeOpenConfirmationModal = element} />
            </>
        );
    }
}
