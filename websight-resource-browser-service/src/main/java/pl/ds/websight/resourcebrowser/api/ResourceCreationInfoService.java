package pl.ds.websight.resourcebrowser.api;

import org.apache.sling.api.resource.ResourceResolver;

public interface ResourceCreationInfoService<T> {

    T getInfo(ResourceResolver resourceResolver, String path, String type);

}
