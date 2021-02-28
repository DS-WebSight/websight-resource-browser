import { SAVE_OPERATIONS } from './ResourceBrowserConstants.js';

export const findCreatedResource = (changelog, provider, path) => {
    let foundResourceDefinition;
    const fetchDefinition = (createdResourceParentPath, createdResource) => {
        if (!foundResourceDefinition) {
            const resourcePath = getResourcePath(createdResourceParentPath, createdResource.name);
            if (resourcePath === path) {
                foundResourceDefinition = createdResource;
            } else if (createdResource.children.length) {
                createdResource.children.find(child => fetchDefinition(resourcePath, child));
            }
        }
        return foundResourceDefinition;
    }

    Object.keys(changelog)
        .find(changelogPath =>
            changelog[changelogPath]
                .filter(changelogForPath => changelogForPath.provider === provider && changelogForPath[SAVE_OPERATIONS.CREATE_RESOURCE])
                .map(changelogForPath => changelogForPath[SAVE_OPERATIONS.CREATE_RESOURCE])
                .find(createdResources => createdResources.find(createdResource => fetchDefinition(changelogPath, createdResource)))
        );

    return foundResourceDefinition;
}

export const getResourcePath = (parentPath, childName) =>
    parentPath.endsWith('/') ? (parentPath + childName) : (parentPath + '/' + childName);
