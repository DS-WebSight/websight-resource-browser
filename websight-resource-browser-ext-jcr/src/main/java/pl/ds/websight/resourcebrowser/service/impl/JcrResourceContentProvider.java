package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.commons.mime.MimeTypeService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.ResourceContentProvider;
import pl.ds.websight.resourcebrowser.util.JcrUtil;

import javax.jcr.Node;
import javax.jcr.Property;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import java.io.InputStream;

@Component(service = ResourceContentProvider.class, property = { "provider=" + JcrUtil.JCR_PROVIDER })
public class JcrResourceContentProvider implements ResourceContentProvider {

    private static final Logger LOG = LoggerFactory.getLogger(JcrResourceContentProvider.class);
    private static final String JCR_DATA = "jcr:data";
    private static final String JCR_CONTENT = "jcr:content";
    private static final String DEFAULT_JCR_RESOURCE_MIME_TYPE = "application/octet-stream";

    @Reference
    private MimeTypeService mimeTypeService;

    @Override
    public InputStream getContent(Resource resource) {
        Node node = resource.adaptTo(Node.class);
        if (node != null) {
            try {
                if (!node.hasProperty(JCR_DATA) && node.hasNode(JCR_CONTENT)) {
                    node = node.getNode(JCR_CONTENT);
                }
                if (node.hasProperty(JCR_DATA)) {
                    Property jcrDataProperty = node.getProperty(JCR_DATA);
                    if (jcrDataProperty.getType() == PropertyType.BINARY) {
                        return jcrDataProperty.getBinary().getStream();
                    }
                }
            } catch (RepositoryException e) {
                LOG.warn("Could not get {} Node content", resource.getPath(), e);
            }
        }
        return null;
    }

    @Override
    public String getSourcePath(Resource resource) {
        Node node = resource.adaptTo(Node.class);
        if (node != null) {
            try {
                String sourcePath = JCR_DATA;
                if (!node.hasProperty(JCR_DATA) && node.hasNode(JCR_CONTENT)) {
                    node = node.getNode(JCR_CONTENT);
                    sourcePath = JCR_CONTENT + '/' + JCR_DATA;
                }
                if (node.hasProperty(JCR_DATA)) {
                    Property jcrDataProperty = node.getProperty(JCR_DATA);
                    if (jcrDataProperty.getType() == PropertyType.BINARY) {
                        return sourcePath;
                    }
                }
            } catch (RepositoryException e) {
                LOG.warn("Could not get {} Node content", resource.getPath(), e);
            }
        }
        return null;
    }

    @Override
    public String getMimeType(Resource resource) {
        if (hasContent(resource)) {
            String mimeType = getResourceMimeType(resource);
            if (mimeType == null) {
                mimeType = mimeTypeService.getMimeType(resource.getName());
            }
            if (mimeType == null) {
                mimeType = DEFAULT_JCR_RESOURCE_MIME_TYPE;
            }
            return mimeType;
        }
        return null;
    }

    private static String getResourceMimeType(Resource resource) {
        Resource content = resource.getChild(JCR_CONTENT);
        if (content == null) {
            content = resource;
        }
        return content.getValueMap().get("jcr:mimeType", String.class);
    }

    @Override
    public boolean hasContent(Resource resource) {
        String primaryType = resource.getValueMap().get("jcr:primaryType", String.class);
        return "nt:file".equals(primaryType);
    }

}
