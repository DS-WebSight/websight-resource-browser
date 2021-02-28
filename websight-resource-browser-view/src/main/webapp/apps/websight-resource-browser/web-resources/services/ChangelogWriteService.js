import ChangelogReadService from './ChangelogReadService.js';
import { findCreatedResource } from '../utils/ChangelogUtil.js';
import { SAVE_OPERATIONS } from '../utils/ResourceBrowserConstants.js';
import { extractParentWithChild } from '../utils/ResourceBrowserUtil.js';

const getOrCreateVariantChangelog = (changelog, path, provider) => {
    if (!changelog[path]) {
        changelog[path] = [];
    }

    let changelogForResourceVariant = changelog[path].find((variant) => variant.provider === provider);
    if (!changelogForResourceVariant) {
        changelogForResourceVariant = { provider: provider };
        changelog[path].push(changelogForResourceVariant);
    }

    return changelogForResourceVariant;
}

const getOrCreateOperationChangelog = (changelog, path, provider, operation) => {
    const changelogForResourceVariant = getOrCreateVariantChangelog(changelog, path, provider);
    if (!changelogForResourceVariant[operation]) {
        changelogForResourceVariant[operation] = [];
    }
    return changelogForResourceVariant[operation];
}

const getSetPropertyChangelog = (changelog, path, provider) => {
    let setPropertyChangelog;

    const createdResourceChangelog = findCreatedResource(changelog, provider, path);
    if (createdResourceChangelog) {
        setPropertyChangelog = createdResourceChangelog.properties;
    } else {
        setPropertyChangelog = getOrCreateOperationChangelog(changelog, path, provider, SAVE_OPERATIONS.SET_PROPERTY);
    }

    return setPropertyChangelog;
}

class ChangelogWriteService {

    copyResource(changelog, resource, destination) {
        const { path, providers } = resource;
        providers
            .filter(({ modifiable }) => modifiable)
            .forEach(({ value }) => {
                const createdResource = findCreatedResource(changelog, value, path);
                if (createdResource) {
                    const { parentPath, childName } = extractParentWithChild(destination);
                    const createdParentChangelog = findCreatedResource(changelog, value, parentPath);
                    const resourceCopy = { ...createdResource, name: childName };
                    if (createdParentChangelog) {
                        createdParentChangelog.children.push(resourceCopy);
                    } else {
                        getOrCreateOperationChangelog(changelog, parentPath, value, SAVE_OPERATIONS.CREATE_RESOURCE)
                            .push(resourceCopy);
                    }
                } else {
                    const copyChangelog = getOrCreateOperationChangelog(changelog, path, value, SAVE_OPERATIONS.COPY_RESOURCE);
                    if (!copyChangelog.includes(destination)) {
                        copyChangelog.push(destination);
                    }
                }
            })
    }

    createResource(changelog, parentPath, provider, name, type, properties) {
        const child = { name: name, type: type, properties: properties, children: [] };
        const createdParentChangelog = findCreatedResource(changelog, provider, parentPath);
        if (createdParentChangelog) {
            createdParentChangelog.children.push(child);
        } else {
            getOrCreateOperationChangelog(changelog, parentPath, provider, SAVE_OPERATIONS.CREATE_RESOURCE).push(child);
        }
    }

    undoCreateResource(changelog, parentPath, name, provider) {
        const createdParentChangelog = findCreatedResource(changelog, provider, parentPath);
        if (createdParentChangelog) {
            const indexOfCreatedChildToRemove = createdParentChangelog.children.findIndex(child => child.name === name);
            if (indexOfCreatedChildToRemove >= 0) {
                createdParentChangelog.children.splice(indexOfCreatedChildToRemove, 1);
                return true;
            }
        }
        const createChangelog = getOrCreateOperationChangelog(changelog, parentPath, provider, SAVE_OPERATIONS.CREATE_RESOURCE);
        const createdResourceIndex = createChangelog.findIndex(createdResource => createdResource.name === name);
        if (createdResourceIndex >= 0) {
            createChangelog.splice(createdResourceIndex, 1);
            return true;
        }
    }

    removeResource(changelog, resource) {
        const { removed } = ChangelogReadService.getResourceState(changelog, resource);
        if (!removed) {
            const { name, path, providers } = resource;
            const parentPath = extractParentWithChild(path).parentPath;
            providers
                .filter(({ modifiable }) => modifiable)
                .forEach(({ value }) => {
                    if (!this.undoCreateResource(changelog, parentPath, name, value)) {
                        const removeChangelog = getOrCreateOperationChangelog(changelog, parentPath, value, SAVE_OPERATIONS.REMOVE_RESOURCE);
                        if (!removeChangelog.includes(name)) {
                            removeChangelog.push(name);
                            Object.keys(changelog)
                                .filter(changelogPath => changelogPath.startsWith(path))
                                .forEach(changelogPath => {
                                    delete changelog[changelogPath];
                                });
                        }
                    }
                });
        }
    }

    moveResource(changelog, resource, destination, orderBefore) {
        const { path, providers } = resource;
        providers
            .filter(({ modifiable }) => modifiable)
            .forEach(({ value }) => {
                const createdResource = findCreatedResource(changelog, value, path);
                if (createdResource) {
                    this.copyResource(changelog, resource, destination);
                    this.undoCreateResource(changelog, extractParentWithChild(path).parentPath, createdResource.name, value);
                } else {
                    const variantChangelog = getOrCreateVariantChangelog(changelog, path, value);
                    if (destination === path && !orderBefore) {
                        this.undoMoveResource(changelog, resource);
                    } else {
                        variantChangelog[SAVE_OPERATIONS.MOVE_RESOURCE] = { destination: destination, orderBefore: orderBefore };
                    }
                }
            })
    }

    undoMoveResource(changelog, resource) {
        const { path, providers } = resource;
        providers
            .filter(({ modifiable }) => modifiable)
            .forEach(({ value }) => {
                const variantChangelog = getOrCreateVariantChangelog(changelog, path, value);
                delete variantChangelog[SAVE_OPERATIONS.MOVE_RESOURCE];
            })
    }

    removeProperty(changelog, path, provider, name) {
        const removeChangelog = getOrCreateOperationChangelog(changelog, path, provider, SAVE_OPERATIONS.REMOVE_PROPERTY);
        if (!removeChangelog.includes(name)) {
            removeChangelog.push(name);
        }
    }

    undoRemoveProperty(changelog, path, provider, name) {
        const removeChangelog = getOrCreateOperationChangelog(changelog, path, provider, SAVE_OPERATIONS.REMOVE_PROPERTY);
        const propertyIndex = removeChangelog.indexOf(name);
        if (propertyIndex >= 0) {
            removeChangelog.splice(propertyIndex, 1);
        }
    }

    setProperty(changelog, path, provider, name, type, value) {
        const setPropertyChangelog = getSetPropertyChangelog(changelog, path, provider);
        const propertyIndex = setPropertyChangelog.findIndex((prop) => prop.name === name);
        if (propertyIndex >= 0) {
            setPropertyChangelog.splice(propertyIndex, 1);
        }
        setPropertyChangelog.push({ name: name, type: type, [Array.isArray(value) ? 'values' : 'value']: value });
    }

    undoSetProperty(changelog, path, provider, name) {
        const setPropertyChangelog = getSetPropertyChangelog(changelog, path, provider);
        const propertyIndex = setPropertyChangelog.findIndex((prop) => prop.name === name);
        if (propertyIndex >= 0) {
            setPropertyChangelog.splice(propertyIndex, 1);
        }
    }

    convertBinaryValue(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function(event) {
                resolve(event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

}

export default new ChangelogWriteService();
