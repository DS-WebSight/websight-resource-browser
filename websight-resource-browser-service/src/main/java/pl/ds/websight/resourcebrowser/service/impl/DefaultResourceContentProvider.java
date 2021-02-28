package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.commons.mime.MimeTypeService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import pl.ds.websight.resourcebrowser.api.ResourceContentProvider;

import java.io.InputStream;

@Component(service = DefaultResourceContentProvider.class)
public class DefaultResourceContentProvider implements ResourceContentProvider {

    private static final String DEFAULT_RESOURCE_CONTENT_TYPE = "application/octet-stream";

    @Reference
    private MimeTypeService mimeTypeService;

    @Override
    public InputStream getContent(Resource resource) {
        if (resource != null) {
            return resource.adaptTo(InputStream.class);
        }
        return null;
    }

    @Override
    public String getSourcePath(Resource resource) {
        return null;
    }

    @Override
    public String getMimeType(Resource resource) {
        String mimeType = null;
        if (hasContent(resource)) {
            mimeType = resource.getResourceMetadata().getContentType();
            if (mimeType == null) {
                mimeType = mimeTypeService.getMimeType(resource.getName());
            }
            if (mimeType == null) {
                mimeType = DEFAULT_RESOURCE_CONTENT_TYPE;
            }
        }
        return mimeType;
    }

    @Override
    public boolean hasContent(Resource resource) {
        return "nt:file".equals(resource.getResourceType());
    }

}
