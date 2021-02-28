import { findCreatedResource, getResourcePath } from '../utils/ChangelogUtil.js';
import { SAVE_OPERATIONS } from '../utils/ResourceBrowserConstants.js';
import { extractParentWithChild, mapProvidersData } from '../utils/ResourceBrowserUtil.js';

const excludeResourceFromTree = (tree, parentPath, name) => {
    const resourcePath = getResourcePath(parentPath, name);
    delete tree.items[resourcePath];

    const resourceToExcludeIndex = tree.items[parentPath].children.findIndex(path => path === resourcePath);
    if (resourceToExcludeIndex >= 0) {
        tree.items[parentPath].children.splice(resourceToExcludeIndex, 1);
        if (tree.items[parentPath].children.length === 0) {
            tree.items[parentPath] = {
                ...tree.items[parentPath],
                isFolder: false,
                isExpanded: false,
                hasChildren: false
            }
        }
    }
}

class ChangelogReadService {

    includeCreatedResources(changelog, tree) {
        const defaultResource = {
            children: [],
            hasChildren: false,
            hasContent: false,
            fromChangelog: true,
            isExpanded: true,
            isFolder: false,
            isLoading: false
        };

        const childrenInOrder = (parent, children) =>
            parent.orderable ? children : children.sort();

        const includeIntoParentResource = (parentResource, childPath) => {
            if (!parentResource.children.includes(childPath)) {
                tree.items[parentResource.path] = {
                    ...parentResource,
                    children: childrenInOrder(parentResource, [
                        ...parentResource.children,
                        childPath
                    ]),
                    isLoading: false,
                    hasChildren: true,
                    isFolder: true,
                    isExpanded: true
                };
            }
        };

        const addNewResource = (createdResource, parentPath, provider) => {
            const childPath = getResourcePath(parentPath, createdResource.name);
            tree.items[childPath] = {
                ...defaultResource,
                id: childPath,
                name: createdResource.name,
                path: childPath,
                providers: mapProvidersData([{
                    name: provider,
                    modifiable: true
                }]),
                type: createdResource.type
            };
            includeIntoParentResource(tree.items[parentPath], childPath);
            if (createdResource.children && createdResource.children.length) {
                createdResource.children.forEach(child => addNewResource(child, childPath, provider));
            }
        };

        Object.keys(changelog)
            .filter(path => Object.keys(tree.items).includes(path))
            .forEach(path => {
                changelog[path]
                    .filter(operationsPerProvider => operationsPerProvider[SAVE_OPERATIONS.CREATE_RESOURCE])
                    .forEach(operationsPerProvider => {
                        operationsPerProvider[SAVE_OPERATIONS.CREATE_RESOURCE]
                            .forEach(createdResource => addNewResource(createdResource, path, operationsPerProvider.provider));
                    });
            });

        Object.keys(changelog).forEach(path => {
            changelog[path]
                .map(operationsPerProvider => operationsPerProvider[SAVE_OPERATIONS.MOVE_RESOURCE])
                .filter(moveOperation => moveOperation)
                .forEach(moveOperation => {
                    const source = extractParentWithChild(path);
                    const destination = extractParentWithChild(moveOperation.destination);

                    const sourceIndex = tree.items[source.parentPath].children.findIndex(child => child === path);
                    const sourceParentChildren = tree.items[source.parentPath].children;
                    if (sourceIndex >= 0) {
                        sourceParentChildren.splice(sourceIndex, 1);
                    }

                    tree.items[source.parentPath] = {
                        ...tree.items[source.parentPath],
                        children: sourceParentChildren
                    }

                    const isDestinationResourceLoadedIntoTree = Object.keys(tree.items).includes(destination.parentPath);
                    if (isDestinationResourceLoadedIntoTree) {
                        if (moveOperation.destination !== path) {
                            tree.items[moveOperation.destination] = {
                                ...tree.items[path],
                                id: moveOperation.destination,
                                name: destination.childName,
                                movedFrom: {
                                    parentPath: source.parentPath,
                                    path: path,
                                    index: sourceIndex
                                },
                                fromChangelog: true
                            }
                        }

                        const destinationIndex = moveOperation.orderBefore
                            ? tree.items[destination.parentPath].children.findIndex(child => child === moveOperation.orderBefore) || 0
                            : tree.items[destination.parentPath].children.length;
                        const destinationParentChildren = tree.items[destination.parentPath].children;
                        if (!destinationParentChildren.includes(moveOperation.destination)) {
                            destinationParentChildren.splice(destinationIndex, 0, moveOperation.destination);
                        }

                        tree.items[destination.parentPath] = {
                            ...tree.items[destination.parentPath],
                            children: childrenInOrder(tree.items[destination.parentPath], destinationParentChildren),
                            isExpanded: true,
                            isFolder: true,
                            hasChildren: true
                        }
                    }
                })
        });

        Object.keys(changelog).forEach(path => {
            changelog[path]
                .filter(operationsPerProvider => operationsPerProvider[SAVE_OPERATIONS.COPY_RESOURCE])
                .forEach(operationsPerProvider => {
                    operationsPerProvider[SAVE_OPERATIONS.COPY_RESOURCE]
                        .forEach(resourceCopyPath => {
                            const { childName, parentPath } = extractParentWithChild(resourceCopyPath);

                            if (tree.items[parentPath] && !tree.items[resourceCopyPath]) {
                                tree.items[resourceCopyPath] = {
                                    ...tree.items[path],
                                    id: resourceCopyPath,
                                    name: childName,
                                    path: path,
                                    notDraggable: true,
                                    providers: mapProvidersData([{
                                        name: operationsPerProvider.provider,
                                        modifiable: true
                                    }]),
                                    fromChangelog: true,
                                    isExpanded: false,
                                    isCopy: true
                                };
                                includeIntoParentResource(tree.items[parentPath], resourceCopyPath);
                            }
                        })
                });
        });

        return tree;
    }

    excludeCreatedResources(changelog, tree) {
        Object.values(tree.items)
            .filter(resource => resource.fromChangelog)
            .reverse()
            .forEach(resource => {
                const { name, id, movedFrom } = resource;
                const parentPath = extractParentWithChild(id).parentPath;
                excludeResourceFromTree(tree, parentPath, name);
                if (movedFrom) {
                    tree.items[movedFrom.parentPath].children.splice(movedFrom.index, 0, movedFrom.path);
                }
            });
        return tree;
    }

    getExpandedPaths(changelog, tree) {
        const expandedPaths = [];
        const movedFromPaths = [];
        Object.values(tree.items)
            .filter(({ isExpanded, path }) => isExpanded && path)
            .forEach(({ path, movedFrom }) => {
                expandedPaths.push(path);
                movedFromPaths.push(movedFrom);
            })
        return expandedPaths.filter(expandedPath => !movedFromPaths.includes(expandedPath));
    }

    getPropertyState(pathChangelog, provider, property) {
        const { name, value } = property;
        const state = {
            modified: false,
            removed: false,
            value: value
        };

        if (pathChangelog) {
            const operationsPerProvider = pathChangelog
                .find(providerOperations => providerOperations.provider === provider);
            if (operationsPerProvider) {
                if (operationsPerProvider[SAVE_OPERATIONS.REMOVE_PROPERTY]) {
                    state.removed = operationsPerProvider[SAVE_OPERATIONS.REMOVE_PROPERTY].includes(name);
                }

                const setProperty = operationsPerProvider[SAVE_OPERATIONS.SET_PROPERTY];
                if (setProperty) {
                    const modifiedProperty = setProperty.find(modified => modified.name === name);
                    if (modifiedProperty) {
                        state.modified = true;
                        state.value = modifiedProperty.value;
                    }
                }
            }
        }

        return state;
    }

    getResourceState(changelog, resource) {
        const state = {
            created: resource.movedFrom || false,
            modified: false,
            properties: {},
            removed: false
        }

        const { id, path, providers } = resource;
        const modifiable = providers.some(provider => provider.modifiable);
        if (modifiable) {
            providers.forEach(provider => {
                const { value } = provider;
                const createdResourceDefinition = findCreatedResource(changelog, value, path);
                if (createdResourceDefinition) {
                    state.created = true;
                    state.properties[value] = createdResourceDefinition.properties
                }
            });

            if (changelog[path]) {
                state.modified = changelog[path]
                    .some((providerChangelog) => Object.values(SAVE_OPERATIONS)
                        .some(operation => {
                            if (operation === SAVE_OPERATIONS.COPY_RESOURCE) {
                                return providerChangelog[operation] &&
                                    (!Array.isArray(providerChangelog[operation]) || providerChangelog[operation].includes(id));
                            } else {
                                return providerChangelog[operation] &&
                                    (!Array.isArray(providerChangelog[operation]) || providerChangelog[operation].length);
                            }
                        }))
            }

            if (!state.modified) {
                state.modified = Object.keys(changelog)
                    .some(changelogPath => changelog[changelogPath]
                        .some(providerChangelog => providerChangelog[SAVE_OPERATIONS.MOVE_RESOURCE]
                            && extractParentWithChild(providerChangelog[SAVE_OPERATIONS.MOVE_RESOURCE].destination).parentPath === path));
            }

            state.removed = Object.keys(changelog)
                .filter(changelogPath => path.startsWith(changelogPath))
                .some(changelogPath => changelog[changelogPath]
                    .filter(variantChangelog => providers.some(provider => provider.value === variantChangelog.provider))
                    .map(variantChangelog => variantChangelog[SAVE_OPERATIONS.REMOVE_RESOURCE])
                    .some(removedChildNames => (removedChildNames || [])
                        .map(removedChildName => getResourcePath(changelogPath, removedChildName))
                        .some(removedChildPath => path === removedChildPath || path.startsWith(removedChildPath + '/'))
                    )
                );
        }

        return state;
    }

    getChangeTypes(changelog) {
        const changesRelatedTo = {
            properties: false,
            tree: false
        }

        Object.keys(changelog)
            .forEach(path => {
                Object.keys(changelog[path])
                    .forEach(providedVariant => {
                        Object.keys(changelog[path][providedVariant])
                            .forEach(operationName => {
                                const operation = changelog[path][providedVariant][operationName];
                                if (operation && (!Array.isArray(operation) || operation.length)) {
                                    if (operationName.endsWith('Resource')) {
                                        changesRelatedTo.tree = true;
                                    } else if (operationName.endsWith('Property')) {
                                        changesRelatedTo.properties = true;
                                    }
                                }
                            })
                    })
            });

        return changesRelatedTo;
    }

    isEmpty(changelog) {
        return !Object.values(changelog).some(pathChangelog =>
            pathChangelog.some(providerChangelog => Object.values(SAVE_OPERATIONS)
                .some(operationName => providerChangelog[operationName] &&
                    (!Array.isArray(providerChangelog[operationName]) || providerChangelog[operationName].length))));
    }

    isSaved(prevChangelog, changelog) {
        return this.isEmpty(changelog) && !this.isEmpty(prevChangelog);
    }
}

export default new ChangelogReadService();
