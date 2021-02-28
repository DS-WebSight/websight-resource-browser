import RestClient from 'websight-rest-atlaskit-client/RestClient';

import { mapProvidersData } from '../utils/ResourceBrowserUtil.js';

export const ROOT_PATH = '/';
export const VIRTUAL_ROOT_PATH = 'root';

const expandIfRoot = (resource) => ({
    ...resource,
    isExpanded: true
});

const mapResourceData = (resource, allProviders) => ({
    id: resource.path,
    name: resource.name,
    path: resource.path,
    type: resource.type,
    shadowedBy: resource.shadowedBy,
    providers: resource.providers.map((provider) => ({
        ...allProviders.find((({ value }) => value === provider)),
        hasContent: provider.hasContent || false
    })),
    hasContent: resource.hasContent || false,
    hasChildren: resource.hasChildren || false,
    orderable: resource.orderable || false,
    children: resource.children || [],
    isFolder: resource.hasChildren || false,
    isLoading: false
});

const listRequestParameters = (parameters) => {
    const { path, paths, providers } = parameters;
    const pathsExceptVirtualRoot = (paths || [])
        .filter(pathString => pathString !== VIRTUAL_ROOT_PATH);

    const preparePaths = () => {
        if (pathsExceptVirtualRoot && pathsExceptVirtualRoot.length) {
            return pathsExceptVirtualRoot;
        } else if (path) {
            return [path];
        } else {
            return [ROOT_PATH];
        }
    }

    return {
        paths: preparePaths(),
        providers: providers.map((provider) => provider.value)
    }
};

const contentRequestParameters = (parameters) => {
    const { path, providers } = parameters;

    return {
        path: path,
        providers: providers.map((provider) => provider.value)
    }
};

const listResourceResponseData = (resourcesArray, allProviders) => {
    const newItems = [];

    resourcesArray.forEach((resource) => {
        resource.children = (resource.children || [])
            .map((child) => {
                newItems.push(mapResourceData(child, allProviders));
                return child.path;
            });

        let mappedResource = mapResourceData(resource, allProviders);

        if (mappedResource.path === ROOT_PATH) {
            mappedResource = expandIfRoot(mappedResource);
        }

        newItems.push(mappedResource);
    });

    return newItems
}

class ResourceService {
    constructor() {
        this.client = new RestClient('websight-resource-browser-service');
        this.providers = [];
    }

    get initialTree() {
        return {
            [VIRTUAL_ROOT_PATH]: {
                hasChildren: true,
                children: [ROOT_PATH],
                isExpanded: true
            },
            [ROOT_PATH]: {
                hasChildren: true,
                children: [],
                id: ROOT_PATH,
                providers: [],
                path: '/',
                isFolder: true,
                isExpanded: false,
                isLoading: true
            }
        }
    }

    get allProviders() {
        return this.providers;
    }

    listProviders(onComplete) {
        this.client.get({
            action: 'list-resource-providers',
            onSuccess: ({ entity }) => {
                this.providers = mapProvidersData(entity);
                onComplete(this.providers);
            },
            onFailure: () => onComplete([]),
            onError: () => onComplete([]),
            onNonFrameworkError: () => onComplete([])
        });
    }

    listResources(parameters, onComplete) {
        this.client.get({
            action: 'list-resources',
            parameters: listRequestParameters(parameters),
            onSuccess: ({ entity }) => onComplete(listResourceResponseData(entity, this.providers)),
            onValidationFailure: () => onComplete([]),
            onFailure: () => onComplete([]),
            onError: () => onComplete([]),
            onNonFrameworkError: () => onComplete([])
        });
    }

    getResourceContentData(parameters, onSuccess) {
        this.client.get({
            action: 'get-resource-content-data',
            parameters: contentRequestParameters(parameters),
            onSuccess: ({ entity }) => onSuccess(entity)
        });
    }

    getResourceContent(parameters, onSuccess, onError) {
        const fetchParams = this.client.buildGetFetchParameters({
            action: 'get-resource-content',
            parameters: contentRequestParameters(parameters)
        });
        fetch(fetchParams.url, fetchParams.options)
            .then(response => {
                if (!response.ok) {
                    throw {
                        message: 'Could not fetch content',
                        messageDetails: `Could not fetch content for resource '${parameters.path}'`
                    };
                }
                return response;
            })
            .then(response => response.text())
            .then(text => onSuccess(text))
            .catch(error => onError(error));
    }

    listProperties(parameters, onComplete) {
        if (!parameters.providers || !parameters.providers.length) return;

        this.client.get({
            action: 'get-properties',
            parameters: parameters,
            onSuccess: ({ entity }) => onComplete(entity),
            onFailure: () => onComplete([]),
            onError: () => onComplete([]),
            onNonFrameworkError: () => onComplete([])
        });
    }

    getResourceCreationInfo(parameters, onComplete) {
        this.client.get({
            action: 'resource-creation-info',
            parameters: parameters,
            onSuccess: ({ entity }) => onComplete(entity),
            onFailure: () => onComplete([]),
            onError: () => onComplete([]),
            onNonFrameworkError: () => onComplete([])
        })
    }

    saveChanges(changelog, onSuccess, onFailure) {
        this.client.post({
            action: 'save-changes',
            data: { changelog: JSON.stringify(changelog) },
            onSuccess: onSuccess,
            onFailure: onFailure,
            onError: onFailure,
            onNonFrameworkError: onFailure
        })
    }

    findResources(phrase, selectedProviders, onSuccess, onComplete) {
        this.client.get({
            action: 'quick-search',
            parameters: {
                phrase: phrase,
                providers: selectedProviders.map((provider) => provider.value)
            },
            onSuccess: ({ entity }) => onSuccess(listResourceResponseData(entity.results || [], this.providers), entity.data || {}),
            onValidationFailure: () => onComplete(),
            onFailure: () => onComplete(),
            onError: () => onComplete(),
            onNonFrameworkError: () => onComplete()
        });
    }

}

export default new ResourceService();
