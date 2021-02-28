import React from 'react';
import Tabs from '@atlaskit/tabs';
import Tooltip from '@atlaskit/tooltip';
import { TooltipPrimitive } from '@atlaskit/tooltip/styled';
import styled from 'styled-components';

import { colors } from 'websight-admin/theme';
import { debounce } from 'websight-admin/Utils';
import { errorNotification } from 'websight-rest-atlaskit-client/Notification';
import { ResizableWrapper } from 'websight-admin/Wrappers';

import ChangelogReadService from '../services/ChangelogReadService.js';
import ChangelogWriteService from '../services/ChangelogWriteService.js';
import { extractParentWithChild } from '../utils/ResourceBrowserUtil.js';
import { PROPERTY_TYPE } from '../utils/ResourceBrowserConstants.js';
import ResourceEditor from './ResourceEditor.js';
import ResourceQuickSearch from './ResourceQuickSearch.js';
import ResourceService from '../services/ResourceService.js';

const RESOURCE_EDITOR_RESIZABLE_HEIGHT_LOCAL_STORAGE_KEY = 'websight.resource-browser.resource.editor.resizable.height';

const ProviderDotTooltip = styled(TooltipPrimitive)`
    background: white;
    border-radius: 15px;
    color: ${colors.white};
    font-size: 11px;
    max-width: 100px;
    padding: 0 8px;
`;

const providerDotStyle = {
    display: 'flex',
    fontSize: '10px',
    paddingLeft: '2px',
    verticalAlign: 'text-top'
};

const TabsContainer = styled.div`
    width: 100%;
    height: 100%;

    & > div {
        width: 100%;
        height: 100%;
    }
`;

const TabLabelContainer = styled.div`
    display: flex;
    align-items: center;

    i {
        font-size: 16px;
    }

    i.file {
        margin-bottom: 3px;
        margin-right: 2px;
    }

    i.lock {
        background: ${colors.white};
        position: absolute;
        font-size: 11px;
        bottom: 0;
        right: 1px;
    }

    i.close {
        margin-left: 6px;
        padding: 2px;
    }

    i.close:hover {
        background: ${colors.lightGrey};
        border-radius: 5px;
    }
`;

const TabLabelFinderContainer = styled(TabLabelContainer)`
    font-weight: bold;
`;

const TabEditorNameContainer = styled.span`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const getChangelogDestination = (resourcePath, sourcePath) => {
    const isPropertyName = sourcePath.indexOf('/') < 0;
    if (isPropertyName) {
        return { name: sourcePath, path: resourcePath };
    }
    const { parentPath, childName } = extractParentWithChild(sourcePath);
    return { name: childName, path: resourcePath + '/' + parentPath }
}

export default class ResourceEditors extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            openedEditors: {},
            selectedTab: 0,
            quickSearch: {
                searchValue: '',
                foundResources: [],
                selectedResourceIndex: 0
            }
        }

        this.onEditorContentChange = this.onEditorContentChange.bind(this);
        this.quickSearchRender = this.quickSearchRender.bind(this);
        this.resourceEditorRender = this.resourceEditorRender.bind(this);
        this.preventLeavingThePage = this.preventLeavingThePage.bind(this);
    }

    componentDidMount() {
        window.addEventListener('beforeunload', this.preventLeavingThePage);
    }

    componentDidUpdate(prevProps) {
        const { changelog, openedResourceEditors, recentlyOpenedEditor } = this.props;
        const { openedEditors } = this.state;

        if (!recentlyOpenedEditor.path) return;

        const providerContentAlreadyLoaded = () => {
            return openedEditors[recentlyOpenedEditor.path].providers
                .filter(provider => recentlyOpenedEditor.providers.map(({ value }) => value).includes(provider))
                .length
        }

        const shouldReload = ChangelogReadService.isSaved(prevProps.changelog, changelog);
        if (shouldReload) {
            openedResourceEditors.forEach(resource => this.getEditorContent(resource));
        }

        if (recentlyOpenedEditor !== prevProps.recentlyOpenedEditor) {
            if (openedEditors[recentlyOpenedEditor.path] && !providerContentAlreadyLoaded()) {
                this.getEditorsContent();
            } else if (!openedEditors[recentlyOpenedEditor.path]) {
                this.getEditorsContent();
            } else {
                this.setProperEditorTabActive();
            }
        }
    }

    preventLeavingThePage(e) {
        const { openedEditors } = this.state;

        const anyEditorNotSaved = Object.values(openedEditors)
            .filter(({ changed }) => changed);

        if (anyEditorNotSaved.length) {
            e.preventDefault();
            e.returnValue = '';
        } else {
            delete e['returnValue'];
        }
    }

    getEditorsContent() {
        const { openedResourceEditors } = this.props;
        const { openedEditors } = this.state;

        const newEditor = (resource) => ({
            path: resource.path,
            name: resource.name,
            providers: []
        });

        const nextProviderWithContentExists = ({ path, providers }) => providers
            .filter(({ value }) => !openedEditors[path].providers.includes(value))
            .length;

        openedResourceEditors
            .filter((resource) => {
                const { path } = resource;
                return !openedEditors[path] || nextProviderWithContentExists(resource);
            })
            .forEach((resource) => {
                this.setState(
                    {
                        openedEditors: {
                            ...openedEditors,
                            [resource.path]: {
                                ...newEditor(resource),
                                ...openedEditors[resource.path]
                            }
                        }
                    },
                    () => this.getEditorContent(resource, this.setProperEditorTabActive)
                )
            });
    }

    getEditorContent(resource, callback) {
        const { changelog } = this.props;
        const contentParams = { path: resource.path, providers: resource.providers };
        ResourceService.getResourceContentData(contentParams,
            (entity) => this.fetchContentAndUpdateEditors(contentParams, resource, entity, changelog, callback));
    }

    fetchContentAndUpdateEditors(contentParams, resource, entity, changelog, callback) {
        ResourceService.getResourceContent(contentParams,
            (content) => this.updateOpenedEditors(resource, entity, changelog, content, callback),
            (error) => errorNotification(error.message, error.messageDetails)
        );
    }

    updateOpenedEditors(resource, contentData, changelog, content, callback) {
        this.setState(({ openedEditors }) => {
            const resourcePath = resource.path;
            const sourcePath = contentData.sourcePath;
            const provider = contentData.provider;
            let changelogContent;
            if (sourcePath) {
                const { name, path } = getChangelogDestination(resourcePath, sourcePath);
                const binaryString = ChangelogReadService.getPropertyState(changelog[path], provider, { name: name }).value;
                changelogContent = binaryString ? atob(binaryString) : binaryString;
            }
            openedEditors[resourcePath] = {
                ...openedEditors[resourcePath],
                providers: ((openedEditors[resourcePath] || {}).providers || []).includes(provider)
                    ? [...openedEditors[resourcePath].providers]
                    : [...openedEditors[resourcePath].providers, provider],
                [provider]: {
                    path: resourcePath,
                    name: resource.name,
                    content: changelogContent ? changelogContent : content,
                    changed: !!changelogContent,
                    readOnly: contentData.readOnly,
                    mimeType: contentData.mimeType,
                    provider,
                    sourcePath
                }
            }
            return { openedEditors };
        }, callback);
    }

    onEditorClose(resourceEditor) {
        const { onClose } = this.props;
        const { openedEditors } = this.state;
        const { path, provider } = resourceEditor;

        const openedProviderEditorsLeft =
            openedEditors[path].providers
                .filter((providerValue) => providerValue !== provider)
                .length

        // TODO: Show confirmation modal if resource is changed: true
        if (!openedProviderEditorsLeft) {
            onClose(openedEditors[path]);
        }

        const mutatedEditor = openedEditors[path]
        mutatedEditor.providers = mutatedEditor.providers.filter((providerValue) => providerValue !== provider);

        if (!mutatedEditor.providers.length) {
            delete openedEditors[path]
        } else {
            delete mutatedEditor[provider];
            openedEditors[path] = mutatedEditor;
        }

        this.setState({ openedEditors });
    }

    setProperEditorTabActive() {
        const { recentlyOpenedEditor } = this.props;
        const { selectedTab, openedEditors } = this.state;

        const editorsToShow = [];
        Object.entries(openedEditors)
            .forEach(([, value]) =>
                value.providers.forEach((provider) => editorsToShow.push(value[provider])))

        const index = editorsToShow
            .map(({ path }) => path)
            .indexOf(recentlyOpenedEditor.path) + 1;  // Adding 1 to index because of Finder tab

        if (index !== selectedTab) {
            this.setState({
                selectedTab: index
            });
        }
    }

    onEditorContentChange(resourcePath, provider, mutatedEditor) {
        if (!mutatedEditor.readOnly) {
            const { changelog, onChangelogUpdate } = this.props;

            this.debounceTimerId = debounce(() => {
                const { content, sourcePath } = mutatedEditor;
                if (sourcePath) {
                    const { name, path } = getChangelogDestination(resourcePath, sourcePath);

                    const encodeUtf8 = (string) => {
                        return unescape(encodeURIComponent(string));
                    }

                    ChangelogWriteService.setProperty(changelog, path, provider, name, PROPERTY_TYPE.BINARY, btoa(encodeUtf8(content)));
                    onChangelogUpdate(changelog);
                }
            }, this.debounceTimerId);

            this.setState(({ openedEditors }) => {
                const mutatedResourceEditor = openedEditors[resourcePath];
                mutatedResourceEditor[provider] = mutatedEditor;

                return { openedEditors: { ...openedEditors, [resourcePath]: mutatedResourceEditor } };
            });
        }
    }

    providerMarkerIcon({ path, provider }) {
        const { openedEditors } = this.state;

        if (openedEditors[path].providers.length <= 1) return null;

        const foundProvider = ResourceService.allProviders
            .find(({ value }) => value === provider)

        if (!foundProvider) return null;

        const LocalProviderDotTooltip = styled(ProviderDotTooltip)`
            background: ${foundProvider.color}
        `;

        return <Tooltip component={LocalProviderDotTooltip} content={foundProvider.label} tag='div' delay={200} position='bottom' hideTooltipOnClick>
            <i className='material-icons' style={{ ...providerDotStyle, color: foundProvider.color }}>
                fiber_manual_record
            </i>
        </Tooltip>
    }

    quickSearchRender() {
        const { openResourcesForPath, onOpenResourcesEditor } = this.props;

        const onQuickSearchChange = (quickSearch, callback) => {
            this.setState({ quickSearch: quickSearch }, callback);
        }

        return ({
            label:
                <TabLabelFinderContainer>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <i className='material-icons-outlined file'>filter_list</i>
                    </div>
                    <TabEditorNameContainer>
                        Finder
                    </TabEditorNameContainer>
                </TabLabelFinderContainer>,
            content:
                <>
                    <ResourceQuickSearch
                        selectedProviders={this.props.selectedProviders}
                        quickSearch={this.state.quickSearch}
                        onQuickSearchChange={onQuickSearchChange}
                        openResourcesForPath={openResourcesForPath}
                        onOpenResourcesEditor={onOpenResourcesEditor}
                    />
                </>
        });
    }

    resourceEditorRender(resourceEditor) {
        const { path, changed, name, provider, readOnly } = resourceEditor;

        return ({
            label:
                <Tooltip key={`tooltip-${path}`} content={readOnly ? path + ' (Read only)' : path} tag='span' delay={200} position='top' hideTooltipOnClick>
                    <TabLabelContainer>
                        <div style={{ position: 'relative', display: 'flex' }}>
                            <i className='material-icons-outlined file'>insert_drive_file</i>
                            {readOnly ? <i className='material-icons-outlined lock'>lock</i> : ''}
                        </div>
                        <TabEditorNameContainer>
                            {changed ? '*' : ''}
                            {name}
                        </TabEditorNameContainer>
                        {this.providerMarkerIcon(resourceEditor)}
                        <i className='material-icons close' onClick={() => this.onEditorClose(resourceEditor)}>close</i>
                    </TabLabelContainer>
                </Tooltip>,
            content:
                <>
                    {
                        path &&
                        <ResourceEditor
                            key={`editor-${path}-${provider}`}
                            editor={resourceEditor}
                            onEditorContentChange={(mutatedEditor) => this.onEditorContentChange(path, provider, mutatedEditor)}
                        />
                    }
                </>
        });
    }

    render() {
        const { selectedTab, openedEditors } = this.state;

        const editorsToShow = [];
        Object.entries(openedEditors).forEach(([, value]) =>
            value.providers.forEach((provider) => editorsToShow.push(value[provider]))
        );

        return (
            <>
                <ResizableWrapper
                    size={JSON.parse(localStorage.getItem(RESOURCE_EDITOR_RESIZABLE_HEIGHT_LOCAL_STORAGE_KEY)) || '55vh'}
                    minHeight="50"
                    maxHeight='70vh'
                    onResizeStop={(event, resizable) => {
                        localStorage.setItem(RESOURCE_EDITOR_RESIZABLE_HEIGHT_LOCAL_STORAGE_KEY, JSON.stringify(resizable.size.height));
                    }}
                >
                    <TabsContainer>
                        <Tabs
                            style={{ height: '100%' }}
                            tabs={[
                                this.quickSearchRender(),
                                ...editorsToShow
                                    .map(this.resourceEditorRender)
                            ]}
                            onSelect={(tab, index) => this.setState({ selectedTab: index })}
                            selected={selectedTab}
                        />
                    </TabsContainer>
                </ResizableWrapper>
            </>
        )
    }
}
