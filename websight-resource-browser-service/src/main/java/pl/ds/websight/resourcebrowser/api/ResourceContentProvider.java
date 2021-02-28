package pl.ds.websight.resourcebrowser.api;

import org.apache.sling.api.resource.Resource;

import java.io.InputStream;

public interface ResourceContentProvider {

    InputStream getContent(Resource resource);

    String getSourcePath(Resource resource);

    String getMimeType(Resource resource);

    boolean hasContent(Resource resource);

}
