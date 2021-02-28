import { colors } from '@atlaskit/theme';

const KNOWN_ACRONYMS = ['Jcr', 'Fs', 'Spi'];
const KNOWN_ACRONYMS_REGEXP = new RegExp(`\\b(${KNOWN_ACRONYMS.join('|')})\\b`, 'gi');

const getProviderShortName = (provider) =>
    provider.split('.').reverse()[0]
        .replace(/([A-Z])/g, ' $1')
        .replace(/(Resource Provider.*)/gi, 'Resource')
        .trim()
        .replace(KNOWN_ACRONYMS_REGEXP, (match) => match.toUpperCase())

const reservedProviderColors = {
    'org.apache.sling.jcr.resource.internal.helper.jcr.JcrResourceProvider': colors.G400,
    'org.apache.sling.servlets.resolver.internal.resource.ServletResourceProvider': colors.R400,
    'org.apache.sling.bundleresource.impl.BundleResourceProvider': colors.Y400
}

const providerColors = [
    colors.B400,
    colors.Y200,
    colors.P75,
    colors.R200,
    colors.T400,
    colors.B200,
    colors.T200,
    colors.P200,
    colors.G200,
    colors.R75
];

const getProviderColor = (provider, index) => {
    let color = reservedProviderColors[provider];
    if (!color) {
        color = providerColors[index % providerColors.length];
    }
    return color;
};

export const mapProvidersData = (providers) =>
    providers
        .map((provider, index) => ({
            label: getProviderShortName(provider.name),
            pluralLabel: `${getProviderShortName(provider.name).replace(/Resource$/, 'Resources')}`,
            value: provider.name.replace(/ /g, ''),
            color: getProviderColor(provider.name, index),
            modifiable: provider.modifiable || false
        }));

export const getSelectedResourcePath = (tree, selectedResourcePath) => {
    const getExistingParentPath = (path) => {
        if (path) {
            if (Object.keys(tree.items).includes(path)) {
                return path;
            }
            return getExistingParentPath(extractParentWithChild(path).parentPath);
        }
        return '/';
    }
    return getExistingParentPath(selectedResourcePath);
}

export const extractParentWithChild = (path) => ({
    parentPath: path ? path.substring(0, path.lastIndexOf('/')) || '/' : '',
    childName: path ? path.substring(path.lastIndexOf('/') + 1) : ''
})
