const OPEN_RESOURCE_EDITOR_WARNING_IGNORED_EXTENSIONS = 'websight.resource-browser.editor.ignored.unsupported.extensions';

const SUPPORTED_TEXT_EXTENSIONS = [
    'c', 'cfg', 'cgi', 'coffee', 'config', 'cpp', 'cs', 'css', 'csv', 'esp', 'groovy', 'h', 'hbs', 'html', 'java', 'js', 'json', 'jsp',
    'jspx', 'jsx', 'less', 'log', 'md', 'php', 'pl', 'py', 'sass', 'scss', 'sh', 'swift', 'tex', 'ts', 'txt', 'vb', 'xhtml', 'xml'
];

export const getExtension = (resourceName) => {
    const splitResourceName = resourceName.split('.');
    if (splitResourceName.length === 1) {
        return '';
    }
    return splitResourceName.pop();
}

const isSupportedTextExtension = (extension) => {
    return extension && SUPPORTED_TEXT_EXTENSIONS.includes(extension);
};

const readIgnoredExtensions = () => {
    return JSON.parse(localStorage.getItem(OPEN_RESOURCE_EDITOR_WARNING_IGNORED_EXTENSIONS) || '[]');
}

const isIgnoredExtension = (extension) => {
    if (!extension) {
        return false;
    }
    const extensions = readIgnoredExtensions();
    return extensions.includes(extension);
};

export const hasUnsupportedExtension = (resourceName) => {
    const extension = getExtension(resourceName);
    return !isSupportedTextExtension(extension) && !isIgnoredExtension(extension);
}

export const persistIgnoredExtension = (extension) => {
    const extensions = readIgnoredExtensions();
    if (!extensions.includes(extension)) {
        extensions.push(extension);
        localStorage.setItem(OPEN_RESOURCE_EDITOR_WARNING_IGNORED_EXTENSIONS, JSON.stringify(extensions));
    }
}
